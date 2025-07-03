import { strapi } from '@components/cms/data';
import ClientMap from '@components/map/ClientMap';

export default async function Page() {

  const routes = await strapi("/routes?populate=*")

  return (
    <div className={"mx-auto w-[98%] p-2"}>
      <ClientMap raw={JSON.stringify(routes.data)} center={[36.1320813, -115.1667648]} />
    </div>
  );
} 