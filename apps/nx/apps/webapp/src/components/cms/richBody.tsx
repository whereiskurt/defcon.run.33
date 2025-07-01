'use client';
import Image from 'next/image';

import {
  BlocksRenderer,
  type BlocksContent,
} from '@strapi/blocks-react-renderer';
import Link from 'next/link';

export default function RichBody({
  content,
}: {
  readonly content: BlocksContent;
}) {
  if (!content) return null;
  return (
    <BlocksRenderer
      content={content}
      blocks={{
        image: ({ image }) => {
          return (
            <Image
              priority={true}
              className="pt-2 pb-2"
              src={image.url}
              width={image.width}
              height={image.height}
              alt={image.alternativeText || ''}
            />
          );
        },
        paragraph: ({ children }) => (
          <p className="text-neutral900 ml-0 pl-0 pb-4">{children}</p>
        ),
        heading: ({ children, level }) => {
          switch (level) {
            case 1:
              return <h1 className="text-5xl">{children}</h1>;
            case 2:
              return <h2 className="text-2xl">{children}</h2>;
            case 3:
              return <h3 className="text-xl">{children}</h3>;
            case 4:
              return <h4 className="text-lg">{children}</h4>;
            default:
              return <h4 className="text-lg">{children}</h4>;
          }
        },
        link: ({ children, url }) => (
          <Link
            target="_blank"
            referrerPolicy="no-referrer"
            className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
            href={url}
          >
            {children}
          </Link>
        ),
        list: ({ children }) => <ul className="list-disc pl-5">{children}</ul>,
        'list-item': ({ children }) => (
          <li className="pt-1 pb-1">{children}</li>
        ),
      }}
    />
  );
}
