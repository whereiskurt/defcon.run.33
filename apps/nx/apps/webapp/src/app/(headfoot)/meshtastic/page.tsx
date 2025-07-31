'use server';

import dynamic from 'next/dynamic';
import { strapi } from '@components/cms/data';
import { Heading, Lead } from '@components/text-effects/Common';
import MqttCredentials from '@components/profile/MqttCredentials';

// Dynamic imports for components
const RichText = dynamic(() => import('@components/cms/rich'), { ssr: true });

export default async function Welcome() {
  const raw = await strapi('/meshtastic?populate=*');
  const { page_body, page_summary, page_title, page_bottom } = raw.data;

  return (
    <>
      <Heading>{page_title}</Heading>
      <Lead>{page_summary}</Lead>
      <RichText body={page_body} />
      <RichText body={page_bottom} />
      <MqttCredentials />
    </>
  );
}
