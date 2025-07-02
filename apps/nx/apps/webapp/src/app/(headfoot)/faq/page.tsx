'use server';

import dynamic from 'next/dynamic';
import { strapi } from '@components/cms/data';
import { Heading, Lead } from '@components/text-effects/Common';

// Dynamic imports for components
const RichText = dynamic(() => import('@components/cms/rich'), { ssr: true });
const Questions = dynamic(() => import('@components/cms/faq/questions'), { ssr: true });

export default async function Welcome() {

  const raw = await strapi('/faq?populate=*');
  const { page_body, page_summary, page_title, page_bottom, FAQ: questions } = raw.data;

  return (
    <>
      <Heading>{page_title}</Heading>
      <Lead>{page_summary}</Lead>
      <RichText body={page_body} />
      <Questions className="mb-4" questions={questions} />
      <RichText body={page_bottom} />
    </>
  );
}
