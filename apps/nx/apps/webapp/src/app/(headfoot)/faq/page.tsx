'use server';

import dynamic from 'next/dynamic';
import { strapi } from '@components/cms/data';
import { Heading, Lead } from '@components/ui/typography';

// Dynamic imports for components
const RichText = dynamic(() => import('@components/cms/rich'), { ssr: true });
const FAQQuestions = dynamic(() => import('@components/cms/faq/questions'), { ssr: true });

export default async function Welcome() {

  const raw = await strapi('/faq?populate=*');

  const body = raw.data.page_body;
  const summary = raw.data.page_summary;
  const title = raw.data.page_title;
  const bottom = raw.data.page_bottom;
  const questions = raw.data.FAQ;

  const className = '';
  return (
    <>
      <Heading>{title}</Heading>
      <Lead>{summary}</Lead>
      <RichText className="pt-4" body={body} />
      <FAQQuestions className={className} questions={questions} />
      <RichText className="pt-4" body={bottom} />
    </>
  );
}
