-- Add pinned cover photo to reunion albums (null = random cover)
ALTER TABLE "ReunionAlbum" ADD COLUMN "coverPhotoId" TEXT;

ALTER TABLE "ReunionAlbum" ADD CONSTRAINT "ReunionAlbum_coverPhotoId_fkey" FOREIGN KEY ("coverPhotoId") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
