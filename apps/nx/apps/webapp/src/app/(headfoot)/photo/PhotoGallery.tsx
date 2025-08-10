'use client';

import { useState } from 'react';
import { Card, Image } from '@heroui/react';
import { Heading } from '@components/text-effects/Common';

interface DefconEvent {
  dcNumber: string;
  year: number;
  images: Array<{ src: string; alt: string; title: string }>;
}

interface PhotoGalleryProps {
  defconEvents: DefconEvent[];
}

export default function PhotoGallery({ defconEvents }: PhotoGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleImageClick = (src: string) => {
    setSelectedImage(src);
  };

  const handleCloseFullscreen = () => {
    setSelectedImage(null);
  };

  const renderImageGrid = (event: DefconEvent) => {
    // Always show 4 slots, fill with placeholders if needed
    const dcVersion = `DC${event.dcNumber}`;
    const imageSlots = [...Array(4)].map((_, index) => {
      const image = event.images[index];
      const dayNumber = index + 1;
      
      if (image) {
        // Has image - show "DC##: Day X" overlay
        return (
          <Card
            key={`${dcVersion}-${index}`}
            isPressable
            onPress={() => handleImageClick(image.src)}
            className="relative w-full aspect-[16/9] overflow-hidden cursor-pointer group"
          >
            <Image
              removeWrapper
              src={image.src}
              alt={image.alt}
              className="z-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity group-hover:bg-black/30">
              <span className="text-white text-2xl font-bold opacity-70 group-hover:opacity-50">
                {dcVersion}: Day {dayNumber}
              </span>
            </div>
          </Card>
        );
      } else {
        // No image - show "Coming soon" placeholder
        return (
          <Card
            key={`${dcVersion}-${index}`}
            className="relative w-full aspect-[16/9] overflow-hidden bg-gray-800"
          >
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white/50 text-xl font-medium">
                Coming soon
              </span>
            </div>
          </Card>
        );
      }
    });

    return (
      <div className="mb-12">
        <Heading level={3} className="text-left mb-4">
          {event.year}: DefCon {event.dcNumber}
        </Heading>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {imageSlots}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="max-w-[900px] mx-auto p-4">
        <Heading level={2} className="text-center mb-8">
          Public Event Photos
        </Heading>
        
        {defconEvents.map(event => (
          <div key={`defcon-${event.dcNumber}`}>
            {renderImageGrid(event)}
          </div>
        ))}
      </div>

      {/* Fullscreen overlay */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center cursor-pointer"
          onClick={handleCloseFullscreen}
        >
          <Image
            removeWrapper
            src={selectedImage}
            alt="Fullscreen view"
            className="w-full h-full object-contain"
          />
        </div>
      )}
    </>
  );
}