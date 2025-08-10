import { strapi } from '@components/cms/data';
import PhotoGallery from './PhotoGallery';

export default async function PhotoPage() {
  // Try to fetch media files from Strapi
  let allImages = [];
  try {
    const mediaResponse = await strapi('/upload/files');
    allImages = mediaResponse || [];
  } catch (error) {
    console.error('Failed to fetch images from Strapi:', error);
    allImages = [];
  }
  
  // Extract DC numbers and group images
  const imagesByDefcon: Record<string, any[]> = {};
  
  // Process Strapi images
  allImages.forEach((file: any) => {
    const match = file.name.match(/dc(\d+)/i);
    if (match) {
      const dcNum = match[1];
      if (!imagesByDefcon[dcNum]) {
        imagesByDefcon[dcNum] = [];
      }
      imagesByDefcon[dcNum].push({
        src: `${process.env.NEXT_PUBLIC_STRAPI_URL || ''}${file.url}`,
        alt: file.alternativeText || file.name,
        title: file.caption || file.name.replace(/dc\d+\./, '').replace(/\.\w+$/, '').replace(/day/, 'Day ')
      });
    }
  });
  
  // Fallback static images
  const staticImages = {
    '33': [
      { src: 'dashboard/dc33.day1.png', alt: 'Day 1', title: 'Day 1' },
      { src: 'dashboard/dc33.day2.png', alt: 'Day 2', title: 'Day 2' },
      { src: 'dashboard/dc33.day3.png', alt: 'Day 3', title: 'Day 3' },
      { src: 'dashboard/dc33.day4.png', alt: 'Day 4', title: 'Day 4' },
    ],
    '32': [
      { src: 'dashboard/dc32.day1.png', alt: 'Day 1', title: 'Day 1' },
      { src: 'dashboard/dc32.day2.png', alt: 'Day 2', title: 'Day 2' },
      { src: 'dashboard/dc32.day3.png', alt: 'Day 3', title: 'Day 3' },
      { src: 'dashboard/dc32.day4.png', alt: 'Day 4', title: 'Day 4' },
    ]
  };
  
  // Merge static images if no Strapi images exist for those versions
  Object.entries(staticImages).forEach(([dcNum, images]) => {
    if (!imagesByDefcon[dcNum] || imagesByDefcon[dcNum].length === 0) {
      imagesByDefcon[dcNum] = images;
    }
  });
  
  // Sort by DC number (descending - newest first) and prepare data
  const sortedDefcons = Object.keys(imagesByDefcon)
    .sort((a, b) => parseInt(b) - parseInt(a))
    .map(dcNum => ({
      dcNumber: dcNum,
      year: 2000 + parseInt(dcNum) - 10, // DC32 = 2024, DC33 = 2025, etc.
      images: imagesByDefcon[dcNum]
    }));

  return (
    <PhotoGallery defconEvents={sortedDefcons} />
  );
}