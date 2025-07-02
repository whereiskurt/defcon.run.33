'use client';

import { BlocksContent } from '@strapi/blocks-react-renderer';
import StrapiRichText from './strapi';

interface BodyProps {
  body: BlocksContent;
  className?: string;
}

export default function Body({ body, className=""}: BodyProps) {
  return (
    <div className={className}>
      <StrapiRichText content={body} />
    </div>
  );
}