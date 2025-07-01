'use client';

import { BlocksContent } from '@strapi/blocks-react-renderer';
import RichBody from './richBody';

interface BodyProps {
  body: BlocksContent;
  className?: string;
}

export default function Body({ body, className=""}: BodyProps) {
  return (
    <div className={className}>
      <RichBody content={body} />
    </div>
  );
}