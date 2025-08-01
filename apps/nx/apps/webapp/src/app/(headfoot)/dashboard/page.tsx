import { auth } from '@auth';
import { redirect } from 'next/navigation';
import {
  Button,
  card,
  Card,
  CardFooter,
  CardHeader,
  Image,
  Link,
} from '@heroui/react';
import { Heading, Lead } from '@components/text-effects/Common';
import { strapi } from '@components/cms/data';
import { Text } from '@components/text-effects/Common';

export default async function Index() {
  const session = await auth();
  const raw = await strapi('/dashboard?populate=*');
  const {
    page_body,
    page_summary,
    page_title,
    page_bottom,
    Cards: cards,
  } = raw.data;

  const dashboard_class = 'max-w-[900px] gap-2 grid grid-cols-12 grid-rows-2';

  const card_class_full = 'w-full h-[300px] col-span-12 sm:col-span-12';
  const card_class_single = 'w-full h-[300px] col-span-12 sm:col-span-4';
  const card_class_wide = 'w-full h-[300px] col-span-12 sm:col-span-8';

  const cardComponents = [];
  for (const card of cards) {
    const {
      card_class = card_class_single,
      card_title_class = 'text-white/60 bg-black/60',
      card_subtitle_class = 'text-white/90 bg-black/30',
      card_local_image_src = 'dashboard/NewMeetPoint.jpg',
      card_local_image_alt = 'Meeting point at LVCC West',
      footer_class = 'absolute bg-black/20 bottom-0 z-10 border-t-1 border-default-600 dark:border-default-100',
      footer_title_class = 'pl-1 pr-1 text-white/90 bg-black/30',
      footer_subtitle_class = 'pl-1 pr-1 text-white/90 bg-black/30',
      button_with_link = true,
      button_link_href = 'https://www.openstreetmap.org/directions?route=36.135189%2C-115.158541%3B#map=19/36.134813/-115.158776',
      button_link_external = true,
      card_title_label = 'MEETUP SPOT',
      card_subtitle_label = 'Early Rabbit Gets the Bib',
      footer_title_label = '🚨 Rally Point 🚨',
      footer_subtitle_label = 'Meet here at 0600AM Daily',
      button_label = 'Open Street Map',
    } = card;

    const tsxCard = (
      <Card key={card.id} isFooterBlurred className={card_class}>
        <CardHeader className="absolute z-10 flex-col items-start">
          <Heading level={6} className={card_title_class}>
            {card_title_label}
          </Heading>
          <Heading level={5} className={card_subtitle_class}>
            {card_subtitle_label}
          </Heading>
        </CardHeader>
        <Image
          className="z-0 w-full h-full object-cover"
          removeWrapper
          alt={card_local_image_alt}
          src={card_local_image_src}
        />
        <CardFooter className={footer_class}>
          <div className="flex flex-grow items-center">
            <div className="flex flex-col">
              <Text variant="xsheading" className={footer_title_class}>
                {footer_title_label}
              </Text>
              <Text variant="xsheading" className={footer_subtitle_class}>
                {footer_subtitle_label}
              </Text>
            </div>
          </div>
          {button_with_link && (
            <Button color="primary" radius="sm" size="sm">
              <Link
                isExternal={button_link_external}
                className="text-white"
                href={button_link_href}
              >
                {button_label}
              </Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    );

    cardComponents.push(tsxCard);
  }


const elky = (
      <Card
        isFooterBlurred
        className="w-full h-[300px] col-span-12 sm:col-span-12 mt-2"
      >
        <CardHeader className="absolute z-10 top-1 flex-col items-start">
          <Heading level={6} className="text-white/60 bg-black/60 font-bold">
            🎂 Happy Birthday Elkentaro 🎉
          </Heading>
          <Heading level={5} className="text-white/90 bg-black/30">
            Ultra Lounge Birthday Mixer
          </Heading>
        </CardHeader>
        <Image
          removeWrapper
          alt="Bithday Boi"
          className="z-0 w-full h-full object-cover"
          src="dashboard/elkhbd.jpg"
        />

        <CardFooter className="absolute bg-black/20 bottom-0 z-10 border-t-1 border-default-600 dark:border-default-100">
          <div className="flex flex-grow items-center">
            <div className="flex flex-col ">
              <Text
                variant="smheading"
                className="pl-1 pr-1 text-white/90 bg-black/30"
              >
                🎂 Happy Birthday Elkentaro 🎂
              </Text>
              <Text
                variant="xsheading"
                className="pl-1 pr-1 text-white/90 bg-black/30"
              >
                After Hours Ultra Lounge Birthday Mixer
              </Text>
            </div>
          </div>
          <Button
            className="bg-button-dashboard-bg hover:bg-button-dashboard-hover text-button-dashboard-text"
            radius="sm"
            size="lg"
            style={{ backgroundColor: 'red' }}
          >
            <Link isExternal className="text-white" href="https://forms.gle/tnstscUNiUkuXA1K9">
              I want to attend!!!
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );  
    
    return (<>
      <div className={dashboard_class}>{cardComponents}</div>
      {!['elk', 'taro'].some(sub =>
        session?.user?.email?.toLowerCase().includes(sub)
      ) &&
      [4, 5, 6].includes(new Date().getDay()) && (
        <div className={dashboard_class}>{elky}</div>
      )}
    </>
  );
}
