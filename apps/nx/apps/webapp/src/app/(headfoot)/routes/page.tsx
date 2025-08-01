'use server';

import { strapi } from '@components/cms/data';
import EnhancedClientMap from '@components/map/EnhancedClientMap';
import styles from './routes.module.css';
import { env } from 'process';

export default async function Page() {

  const nodesUrl = env['MESHMAP_NODES_URL'] || 'https://mqtt.defcon.run/map/nodes.json';

  const routes = await strapi("/routes?populate=*")
  const mqtt_nodes = await livenodes(nodesUrl);

  return (
    <div className={`mx-auto w-[98%] p-2 ${styles.routesContainer}`}>
      <div className={styles.mapWrapper}>
        <EnhancedClientMap raw={JSON.stringify(routes.data)} mqtt_nodes={JSON.stringify(mqtt_nodes)} center={[36.1320813, -115.1667648]} />
      </div>
    </div>
  );
} 

async function livenodes(url: string) {
  const res = await fetch(`${url}`, {
    method: 'GET',
    headers: {
      'Authorization': `bearer ${process.env.AUTH_STRAPI_TOKEN}`
    },
    next: { revalidate: 30 }
  });

  if (!res.ok) {
    throw new Error(`Network response was not ok: ${res.status}-${res.statusText}:${url}`);
  }
  const data = await res.json();
  return data;
}
