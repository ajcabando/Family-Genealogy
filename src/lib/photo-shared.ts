import type { Photo, PhotoTag, PhotoComment, FamilyMember } from '@prisma/client';

export type GalleryPhoto = {
  id: string;
  caption: string | null;
  description: string | null;
  photoDate: string | null;
  location: string | null;
  photographer: string | null;
  favorite: boolean;
  thumbPath: string;
  optimizedPath: string;
  width: number | null;
  height: number | null;
  uploaderId: string | null;
  uploaderName: string | null;
  tags: Array<{ id: string; memberId: string; name: string; x: number | null; y: number | null }>;
  comments: Array<{ id: string; body: string; authorId: string; authorName: string; createdAt: string }>;
  createdAt: string;
  approvalStatus: string;
};

type PhotoWithRels = Photo & {
  tags?: Array<PhotoTag & { member: Pick<FamilyMember, 'id' | 'firstName' | 'lastName'> }>;
  comments?: Array<PhotoComment & { author: Pick<FamilyMember, 'id' | 'firstName' | 'lastName'> }>;
  uploader?: Pick<FamilyMember, 'id' | 'firstName' | 'lastName'> | null;
};

export function serializePhoto(p: PhotoWithRels): GalleryPhoto {
  return {
    id: p.id,
    caption: p.caption,
    description: p.description,
    photoDate: p.photoDate ? p.photoDate.toISOString() : null,
    location: p.location,
    photographer: p.photographer,
    favorite: p.favorite,
    thumbPath: p.thumbPath,
    optimizedPath: p.optimizedPath || p.filePath,
    width: p.width,
    height: p.height,
    uploaderId: p.uploadedById,
    uploaderName: p.uploader ? `${p.uploader.firstName} ${p.uploader.lastName}` : null,
    tags: (p.tags || []).map((t) => ({
      id: t.id,
      memberId: t.memberId,
      name: `${t.member.firstName} ${t.member.lastName}`,
      x: t.xPosition,
      y: t.yPosition,
    })),
    comments: (p.comments || []).map((c) => ({
      id: c.id,
      body: c.body,
      authorId: c.authorId,
      authorName: `${c.author.firstName} ${c.author.lastName}`,
      createdAt: c.createdAt.toISOString(),
    })),
    createdAt: p.createdAt.toISOString(),
    approvalStatus: p.approvalStatus,
  };
}

export const PHOTO_INCLUDE = {
  tags: { include: { member: { select: { id: true, firstName: true, lastName: true } } } },
  comments: { include: { author: { select: { id: true, firstName: true, lastName: true } } } },
  uploader: { select: { id: true, firstName: true, lastName: true } },
} as const;
