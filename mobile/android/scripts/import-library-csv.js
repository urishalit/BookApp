#!/usr/bin/env node

/**
 * CSV to Firebase Import Script
 *
 * Imports library data from a Hebrew CSV export into an existing Firestore family.
 * - Members: Uses existing member by name if found; creates only when no match
 * - Images: Downloads from CSV URLs and uploads to Firebase Storage
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json \
 *   node scripts/import-library-csv.js /path/to/file.csv --family-id=abc123 [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const admin = require('firebase-admin');
const { getStorage, getDownloadURL } = require('firebase-admin/storage');

// Status mapping: Hebrew -> app status
const STATUS_MAP = {
  'רוצה לקרוא': 'to-read',
  'קורא כעת': 'reading',
  'קרא': 'read',
};

// Member color palette for newly created members
const MEMBER_COLORS = [
  '#D4A574', '#8B5A2B', '#E57373', '#64B5F6', '#81C784',
  '#FFB74D', '#BA68C8', '#4DB6AC', '#7986CB', '#F06292',
];

function parseArgs() {
  const args = process.argv.slice(2);
  const csvPath = args.find((a) => !a.startsWith('--'));
  const familyId = args.find((a) => a.startsWith('--family-id='))?.split('=')[1];
  const dryRun = args.includes('--dry-run');

  if (!csvPath || !familyId) {
    console.error('Usage: node import-library-csv.js <csv-path> --family-id=<id> [--dry-run]');
    console.error('  Requires: GOOGLE_APPLICATION_CREDENTIALS env var pointing to service account JSON');
    process.exit(1);
  }

  return { csvPath, familyId, dryRun };
}

function initFirebase() {
  if (admin.apps.length > 0) {
    return { firestore: admin.firestore(), storage: getStorage() };
  }

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath || !fs.existsSync(credPath)) {
    console.error('Error: GOOGLE_APPLICATION_CREDENTIALS must point to a valid service account JSON file');
    process.exit(1);
  }

  // Read storage bucket from google-services.json (same project config the app uses)
  let storageBucket;
  const gsPath = path.join(__dirname, '..', 'google-services.json');
  if (fs.existsSync(gsPath)) {
    const gs = JSON.parse(fs.readFileSync(gsPath, 'utf-8'));
    storageBucket = gs.project_info?.storage_bucket;
  }

  admin.initializeApp({
    credential: admin.credential.cert(credPath),
    ...(storageBucket && { storageBucket }),
  });
  return { firestore: admin.firestore(), storage: getStorage() };
}

function parseCSV(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
  });
  return records;
}

function getRowValue(row, ...keys) {
  for (const key of keys) {
    const val = row[key];
    if (val !== undefined && val !== null && val !== '') {
      return typeof val === 'string' ? val.trim() : String(val).trim();
    }
  }
  return '';
}

function isValidTitle(title) {
  if (!title) return false;
  if (title.startsWith('http://') || title.startsWith('https://')) return false;
  return true;
}

function isValidImageUrl(url) {
  return url && (url.startsWith('http://') || url.startsWith('https://'));
}

/**
 * Get or create member. Always queries existing members by name first.
 */
async function getOrCreateMember(db, familyId, childName, dryRun) {
  if (!childName) return null;

  const membersRef = db.collection('families').doc(familyId).collection('members');
  const snapshot = await membersRef.get();

  const existing = snapshot.docs.find((d) => d.data().name === childName);
  if (existing) {
    return existing.id;
  }

  if (dryRun) {
    console.log(`  [DRY-RUN] Would create member: ${childName}`);
    return `dry-run-member-${childName}`;
  }

  const membersCount = snapshot.size;
  const color = MEMBER_COLORS[membersCount % MEMBER_COLORS.length];
  const docRef = await membersRef.add({
    name: childName,
    color,
    familyId,
  });
  console.log(`  Created member: ${childName} (${docRef.id})`);
  return docRef.id;
}

/**
 * Get or create series. Builds a cache of seriesName -> seriesId.
 */
async function getOrCreateSeries(db, familyId, seriesName, seriesCache, maxOrder, dryRun) {
  if (!seriesName) return undefined;

  if (seriesCache.has(seriesName)) {
    return seriesCache.get(seriesName);
  }

  if (dryRun) {
    const fakeId = `dry-run-series-${seriesName}`;
    seriesCache.set(seriesName, fakeId);
    return fakeId;
  }

  const seriesRef = db.collection('families').doc(familyId).collection('series');
  const docRef = await seriesRef.add({
    name: seriesName,
    totalBooks: maxOrder > 0 ? maxOrder : 0,
  });
  seriesCache.set(seriesName, docRef.id);
  console.log(`  Created series: ${seriesName} (${docRef.id})`);
  return docRef.id;
}

/**
 * Find existing family book by title+author.
 */
async function findFamilyBook(db, familyId, title, author) {
  const snapshot = await db
    .collection('families')
    .doc(familyId)
    .collection('books')
    .where('title', '==', title)
    .where('author', '==', author)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

/**
 * Create a family book.
 */
async function createFamilyBook(db, familyId, data, dryRun) {
  if (dryRun) {
    return `dry-run-book-${data.title}-${data.author}`;
  }

  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined && v !== '')
  );
  cleanData.addedAt = admin.firestore.FieldValue.serverTimestamp();

  const docRef = await db
    .collection('families')
    .doc(familyId)
    .collection('books')
    .add(cleanData);
  return docRef.id;
}

/**
 * Update a family book (e.g. with thumbnailUrl).
 */
async function updateFamilyBook(db, familyId, bookId, data, dryRun) {
  if (dryRun) return;
  await db
    .collection('families')
    .doc(familyId)
    .collection('books')
    .doc(bookId)
    .update(data);
}

/**
 * Check if book is already in member's library.
 */
async function isBookInMemberLibrary(db, familyId, memberId, bookId) {
  const snapshot = await db
    .collection('families')
    .doc(familyId)
    .collection('members')
    .doc(memberId)
    .collection('library')
    .where('bookId', '==', bookId)
    .limit(1)
    .get();
  return !snapshot.empty;
}

/**
 * Add book to member's library.
 */
async function addToMemberLibrary(db, familyId, memberId, bookId, status, dryRun) {
  const exists = await isBookInMemberLibrary(db, familyId, memberId, bookId);
  if (exists) return;

  if (dryRun) {
    console.log(`  [DRY-RUN] Would add to library: ${bookId} status=${status}`);
    return;
  }

  await db
    .collection('families')
    .doc(familyId)
    .collection('members')
    .doc(memberId)
    .collection('library')
    .add({
      bookId,
      status,
      addedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

/**
 * Download image from URL and upload to Firebase Storage.
 */
async function uploadImageToStorage(storage, familyId, bookId, imageUrl, dryRun) {
  if (dryRun) {
    console.log(`  [DRY-RUN] Would upload image from ${imageUrl}`);
    return `https://storage.googleapis.com/dry-run/${familyId}/books/${bookId}/cover.jpg`;
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const timestamp = Date.now();
  const storagePath = `families/${familyId}/books/${bookId}/cover_${timestamp}.jpg`;

  const bucket = storage.bucket();
  const file = bucket.file(storagePath);
  await file.save(buffer, {
    metadata: { contentType: response.headers.get('content-type') || 'image/jpeg' },
  });

  return getDownloadURL(file);
}

async function main() {
  const { csvPath, familyId, dryRun } = parseArgs();

  const absPath = path.resolve(csvPath);
  if (!fs.existsSync(absPath)) {
    console.error(`Error: CSV file not found: ${absPath}`);
    process.exit(1);
  }

  console.log(`Importing from: ${absPath}`);
  console.log(`Family ID: ${familyId}`);
  if (dryRun) console.log('*** DRY RUN - no changes will be made ***\n');

  const { firestore: db, storage } = initFirebase();

  // Verify family exists
  const familyDoc = await db.collection('families').doc(familyId).get();
  if (!familyDoc.exists) {
    console.error(`Error: Family not found: ${familyId}`);
    process.exit(1);
  }

  const records = parseCSV(absPath);
  console.log(`Found ${records.length} rows to process\n`);

  // Pre-scan to compute max series order per series (for totalBooks)
  const seriesMaxOrder = new Map();
  for (const row of records) {
    const seriesName = getRowValue(row, 'Series Name');
    if (seriesName) {
      const num = parseInt(getRowValue(row, 'Number in Series'), 10);
      const current = seriesMaxOrder.get(seriesName) || 0;
      seriesMaxOrder.set(seriesName, Math.max(current, num || 0));
    }
  }

  const memberCache = new Map();
  const seriesCache = new Map();

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const childName = getRowValue(row, 'Child Name');
    const title = getRowValue(row, 'Book Title');
    const author = getRowValue(row, 'Author');
    const genre = getRowValue(row, 'Genre');
    const statusHebrew = getRowValue(row, 'Status');
    const seriesName = getRowValue(row, 'Series Name');
    const numInSeries = parseInt(getRowValue(row, 'Number in Series'), 10) || undefined;
    const imageUrl = getRowValue(row, 'Image URL');

    if (!childName) {
      skipped++;
      continue;
    }

    if (!isValidTitle(title)) {
      if (title) {
        console.warn(`Row ${i + 2}: Skipping - title looks like URL: ${title.substring(0, 50)}...`);
      }
      skipped++;
      continue;
    }

    const status = STATUS_MAP[statusHebrew] || 'to-read';

    try {
      let memberId = memberCache.get(childName);
      if (!memberId) {
        memberId = await getOrCreateMember(db, familyId, childName, dryRun);
        if (!memberId) {
          skipped++;
          continue;
        }
        memberCache.set(childName, memberId);
      }

      let seriesId;
      if (seriesName) {
        const maxOrder = seriesMaxOrder.get(seriesName) || 0;
        seriesId = await getOrCreateSeries(
          db,
          familyId,
          seriesName,
          seriesCache,
          maxOrder,
          dryRun
        );
      }

      const genres = genre ? [genre] : undefined;

      let book = await findFamilyBook(db, familyId, title, author);
      let bookId;

      if (book) {
        bookId = book.id;
      } else {
        bookId = await createFamilyBook(
          db,
          familyId,
          {
            title,
            author,
            genres,
            seriesId,
            seriesOrder: numInSeries,
            addedBy: memberId,
          },
          dryRun
        );
      }

      if (isValidImageUrl(imageUrl) && bookId && !bookId.startsWith('dry-run-')) {
        try {
          const downloadUrl = await uploadImageToStorage(storage, familyId, bookId, imageUrl, dryRun);
          await updateFamilyBook(
            db,
            familyId,
            bookId,
            { thumbnailUrl: downloadUrl },
            dryRun
          );
        } catch (err) {
          console.warn(`Row ${i + 2}: Failed to upload image: ${err.message}`);
        }
      }

      await addToMemberLibrary(db, familyId, memberId, bookId, status, dryRun);
      processed++;
    } catch (err) {
      errors++;
      console.error(`Row ${i + 2}: ${err.message}`);
    }
  }

  console.log(`\nDone. Processed: ${processed}, Skipped: ${skipped}, Errors: ${errors}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
