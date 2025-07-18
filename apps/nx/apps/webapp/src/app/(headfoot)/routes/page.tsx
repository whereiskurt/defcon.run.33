'use server';

import { strapi } from '@components/cms/data';
import ClientMap from '@components/map/ClientMap';
import styles from './routes.module.css';

export default async function Page() {

  const routes = await strapi("/routes?populate=*")
  const mqtt_nodes = await livenodes("https://mqtt.defcon.run/map/nodes.json");

  return (
    <div className={`mx-auto w-[98%] p-2 ${styles.routesContainer}`}>
      <div className={styles.mapWrapper}>
        <ClientMap raw={JSON.stringify(routes.data)} mqtt_nodes={JSON.stringify(mqtt_nodes)} center={[36.1320813, -115.1667648]} />
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
