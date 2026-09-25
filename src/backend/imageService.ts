import {
  ref as storageRef,
  deleteObject,
} from "firebase/storage";
import {
  collection,
  setDoc,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { auth, storage, db } from "./firebase";

export type PhotoCategory = "featured" | "gallery";

export interface WorkItem {
  id: string;
  title: string;
  category: PhotoCategory;
  imageUrl: string;
  storagePath: string;
  fileSize?: number;
  createdAt?: number;
  uploadedBy?: string;
  storageType?: "firebase" | "local";
  displayOrder?: number;
}

export interface UploadWorkParams {
  file: File;
  title: string;
  category: PhotoCategory;
  userEmail?: string;
  onProgress?: (percentage: number) => void;
}

// Client-side persistent deletion tombstones (prevents resurrection across polls and reloads)
const DELETED_WORKS_STORAGE_KEY = "lumiere_deleted_works_v1";

export function getDeletedWorkIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DELETED_WORKS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function isWorkDeleted(id: string): boolean {
  if (!id) return false;
  return getDeletedWorkIds().has(id);
}

export function markWorkDeleted(id: string): void {
  if (typeof window === "undefined" || !id) return;
  try {
    const set = getDeletedWorkIds();
    set.add(id);
    localStorage.setItem(DELETED_WORKS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.warn("Failed to persist deleted work ID:", err);
  }
}

export function unmarkWorkDeleted(id: string): void {
  if (typeof window === "undefined" || !id) return;
  try {
    const set = getDeletedWorkIds();
    set.delete(id);
    localStorage.setItem(DELETED_WORKS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.warn("Failed to unmark deleted work ID:", err);
  }
}

/**
 * Helper to retrieve the current Firebase Admin ID Token.
 */
async function getAdminAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch (tokenErr) {
      console.warn("Could not retrieve Firebase ID token:", tokenErr);
    }
  }
  return headers;
}

/**
 * Upload an image file through our unified Next.js API endpoint.
 * Protected with Bearer authentication and 5-photo limit on "featured".
 */
export async function uploadWorkImage({
  file,
  title,
  category,
  userEmail,
  onProgress,
}: UploadWorkParams): Promise<WorkItem> {
  const authHeaders = await getAdminAuthHeaders();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title);
  formData.append("category", category);
  formData.append("userEmail", userEmail || auth.currentUser?.email || "admin");

  const serverResult = await new Promise<{
    success: boolean;
    item?: WorkItem;
    error?: string;
  }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload", true);

    if (authHeaders["Authorization"]) {
      xhr.setRequestHeader("Authorization", authHeaders["Authorization"]);
    }

    if (onProgress) {
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && evt.total > 0) {
          const percent = Math.round((evt.loaded / evt.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      try {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || `Upload failed with status ${xhr.status}`));
        }
      } catch {
        reject(
          new Error(
            `Server returned unexpected response (${xhr.status}): ${xhr.responseText}`
          )
        );
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network connection error during file upload."));
    };

    xhr.send(formData);
  });

  const uploadedItem = serverResult.item;
  if (!uploadedItem) {
    throw new Error("Invalid response from upload server.");
  }

  // Ensure this ID is clean in tombstones
  unmarkWorkDeleted(uploadedItem.id);

  // Firestore sync using setDoc so document ID matches uploadedItem.id
  const firestoreSync = async () => {
    try {
      await Promise.race([
        setDoc(doc(db, "works", uploadedItem.id), {
          id: uploadedItem.id,
          title: uploadedItem.title,
          category: uploadedItem.category,
          imageUrl: uploadedItem.imageUrl,
          storagePath: uploadedItem.storagePath,
          fileSize: uploadedItem.fileSize,
          uploadedBy: uploadedItem.uploadedBy,
          createdAt: uploadedItem.createdAt,
          displayOrder: uploadedItem.displayOrder ?? null,
          serverCreatedAt: serverTimestamp(),
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Firestore sync timeout")), 2500)
        ),
      ]);
    } catch {
      // Gracefully skipped if Firestore is not initialized yet
    }
  };
  firestoreSync();

  return uploadedItem;
}

/**
 * Replace an existing photo's image while preserving its category and order.
 * Protected with Bearer authentication.
 */
export async function replaceWorkImage({
  workId,
  file,
  newTitle,
  userEmail,
  onProgress,
}: {
  workId: string;
  file: File;
  newTitle?: string;
  userEmail?: string;
  onProgress?: (pct: number) => void;
}): Promise<WorkItem> {
  const authHeaders = await getAdminAuthHeaders();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("replaceId", workId);
  if (newTitle) formData.append("title", newTitle);
  formData.append("userEmail", userEmail || auth.currentUser?.email || "admin");

  const serverResult = await new Promise<{
    success: boolean;
    item?: WorkItem;
    error?: string;
  }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload", true);

    if (authHeaders["Authorization"]) {
      xhr.setRequestHeader("Authorization", authHeaders["Authorization"]);
    }

    if (onProgress) {
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && evt.total > 0) {
          onProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && res.success) {
          resolve(res);
        } else {
          reject(new Error(res.error || `Replace failed with status ${xhr.status}`));
        }
      } catch {
        reject(new Error(`Server error: ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network connection error during replace."));
    xhr.send(formData);
  });

  if (!serverResult.item) {
    throw new Error("Failed to replace image.");
  }

  // Update in Firestore
  try {
    await updateDoc(doc(db, "works", workId), {
      imageUrl: serverResult.item.imageUrl,
      storagePath: serverResult.item.storagePath,
      fileSize: serverResult.item.fileSize,
      ...(newTitle ? { title: newTitle } : {}),
    }).catch(() => {});
  } catch {
    // Ignored
  }

  return serverResult.item;
}

/**
 * Change category of a photo between "featured" and "gallery".
 * Protected with Bearer authentication.
 */
export async function changeWorkCategory(
  id: string,
  newCategory: PhotoCategory
): Promise<{ success: boolean; item?: WorkItem; error?: string }> {
  try {
    const authHeaders = await getAdminAuthHeaders();
    const res = await fetch("/api/works", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({
        action: "change_category",
        id,
        category: newCategory,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "Failed to change category." };
    }

    // Background Firestore update
    try {
      updateDoc(doc(db, "works", id), {
        category: newCategory,
        displayOrder: data.item?.displayOrder ?? null,
      }).catch(() => {});
    } catch {
      // Ignored
    }

    return { success: true, item: data.item };
  } catch (e: unknown) {
    const err = e as { message?: string };
    return { success: false, error: err.message || "Network error changing category." };
  }
}

/**
 * Reorder featured photos.
 * Protected with Bearer authentication.
 */
export async function reorderFeaturedWorks(
  orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const authHeaders = await getAdminAuthHeaders();
    const res = await fetch("/api/works", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({
        action: "reorder_featured",
        orderedIds,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "Failed to reorder featured photos." };
    }

    // Also sync displayOrder to Firestore
    try {
      const updates = orderedIds.map((id, index) =>
        updateDoc(doc(db, "works", id), {
          displayOrder: index + 1,
        }).catch(() => {})
      );
      await Promise.all(updates);
    } catch {
      // Ignored
    }

    return { success: true };
  } catch (e: unknown) {
    const err = e as { message?: string };
    return { success: false, error: err.message || "Network error reordering works." };
  }
}

/**
 * Update photo title.
 * Protected with Bearer authentication.
 */
export async function updateWorkTitle(
  id: string,
  newTitle: string
): Promise<{ success: boolean; item?: WorkItem; error?: string }> {
  try {
    const authHeaders = await getAdminAuthHeaders();
    const res = await fetch("/api/works", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({
        action: "update_title",
        id,
        title: newTitle,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "Failed to update title." };
    }

    // Sync to Firestore
    try {
      await updateDoc(doc(db, "works", id), {
        title: newTitle,
      }).catch(() => {});
    } catch {
      // Ignored
    }

    return { success: true, item: data.item };
  } catch (e: unknown) {
    const err = e as { message?: string };
    return { success: false, error: err.message || "Network error updating title." };
  }
}

/**
 * Subscribe to real-time updates for all uploaded works.
 */
export function subscribeWorkImages(
  onData: (items: WorkItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  let isFirestoreActive = false;
  let isSeeded = false;

  const sanitizeAndEmit = (items: WorkItem[]) => {
    const deletedIds = getDeletedWorkIds();
    const active = items.filter((item) => !deletedIds.has(item.id));
    onData(active);
  };

  const fetchLocalWorks = async () => {
    try {
      const res = await fetch("/api/works");
      const data = await res.json();
      if (data.success && Array.isArray(data.works)) {
        sanitizeAndEmit(data.works);
      }
    } catch (e) {
      console.warn("Could not fetch local works:", e);
    }
  };

  let unsubscribeFirestore: Unsubscribe = () => {};

  try {
    const q = query(collection(db, "works"), orderBy("createdAt", "desc"));
    unsubscribeFirestore = onSnapshot(
      q,
      async (snapshot) => {
        isFirestoreActive = true;

        // Auto-seed Firestore on first connection if the works collection is empty
        if (snapshot.empty && !isSeeded) {
          isSeeded = true;
          try {
            const res = await fetch("/api/works");
            const data = await res.json();
            if (data.success && Array.isArray(data.works) && data.works.length > 0) {
              const deletedIds = getDeletedWorkIds();
              for (const work of data.works) {
                if (!deletedIds.has(work.id)) {
                  await setDoc(doc(db, "works", work.id), {
                    ...work,
                    serverCreatedAt: serverTimestamp(),
                  }).catch(() => {});
                }
              }
              return;
            }
          } catch (seedErr) {
            console.warn("Could not seed Firestore from initial works:", seedErr);
          }
        }

        const firestoreItems: WorkItem[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            title: data.title || "Untitled Work",
            category: data.category === "featured" ? "featured" : "gallery",
            imageUrl: data.imageUrl || "",
            storagePath: data.storagePath || "",
            fileSize: data.fileSize || 0,
            createdAt: data.createdAt || 0,
            uploadedBy: data.uploadedBy || "admin",
            displayOrder: data.displayOrder ?? undefined,
          };
        });

        // Firestore is the sole source of truth when active.
        // Never merge local works which can re-introduce deleted items!
        sanitizeAndEmit(firestoreItems);
      },
      (error) => {
        if (!isFirestoreActive) {
          fetchLocalWorks();
        }
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.warn("Firestore listener init skipped:", err);
  }

  fetchLocalWorks();

  const interval = setInterval(() => {
    if (!isFirestoreActive) {
      fetchLocalWorks();
    }
  }, 3000);

  return () => {
    unsubscribeFirestore();
    clearInterval(interval);
  };
}

/**
 * Delete a work item from both Firebase and the local media vault.
 * Protected with Bearer authentication.
 */
export async function deleteWorkImage(
  workId: string,
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Immediately tombstone in client localStorage so polls and snapshots never display it
    markWorkDeleted(workId);

    // 2. Notify API endpoint to update in-memory / /tmp/works.json
    const authHeaders = await getAdminAuthHeaders();
    try {
      const localRes = await fetch(`/api/works?id=${encodeURIComponent(workId)}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!localRes.ok) {
        const errorData = await localRes.json().catch(() => ({}));
        console.warn("Local delete returned status:", localRes.status, errorData);
      }
    } catch (apiErr) {
      console.warn("API delete call encountered network error:", apiErr);
    }

    // 3. Delete from Firestore (by document ID and by id field for legacy docs)
    try {
      await Promise.race([
        (async () => {
          await deleteDoc(doc(db, "works", workId));
          // Clean up legacy documents where id might be stored in field
          const q = query(collection(db, "works"), where("id", "==", workId));
          const snap = await getDocs(q);
          const deletes = snap.docs.map((d) => deleteDoc(d.ref));
          await Promise.all(deletes);
        })(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Firestore doc delete timeout")), 2000)
        ),
      ]);
    } catch (firestoreErr) {
      console.warn("Firestore doc delete skipped/timed out:", firestoreErr);
    }

    // 4. Delete from Firebase Storage
    if (filePath) {
      try {
        const fileRef = storageRef(storage, filePath);
        await Promise.race([
          deleteObject(fileRef),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Firebase Storage timeout")), 2000)
          ),
        ]);
      } catch (storageErr) {
        console.warn("Firebase Storage file delete skipped/timed out:", storageErr);
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const errorObj = err as { message?: string };
    return {
      success: false,
      error: errorObj?.message || "Failed to delete work item.",
    };
  }
}
