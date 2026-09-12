-- Add optional on-photo placement for tags (percentage of the image, 0-100).
ALTER TABLE "PhotoTag" ADD COLUMN "xPosition" DOUBLE PRECISION;
ALTER TABLE "PhotoTag" ADD COLUMN "yPosition" DOUBLE PRECISION;
