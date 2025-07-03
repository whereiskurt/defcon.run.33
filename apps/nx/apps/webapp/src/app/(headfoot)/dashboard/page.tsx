import { auth } from '@auth';
import { redirect } from 'next/navigation';
import {
  Button,
  Card,
  CardFooter,
  CardHeader,
  Image,
  Link,
} from '@heroui/react';
import { Heading, Lead } from '@components/text-effects/Common';
import { strapi } from '@components/cms/data';
import { Text } from "@components/text-effects/Common";


export default async function Index() {
  // const raw = await strapi('/dashboard?populate=*');
  

  return (
    <>
      <Heading className='mb-2' level={1}>Dashboard</Heading>

      <div className="max-w-[900px] gap-2 grid grid-cols-12 grid-rows-2">

        <Card isFooterBlurred className="w-full h-[300px] col-span-12 sm:col-span-8">
          <CardHeader className="absolute z-10 flex-col items-start">
            <Heading level={6} className="text-white/60 bg-black/60 font-bold">
              MEETUP SPOT
            </Heading>
            <Heading level={5} className="text-white/90 bg-black/30">
              Early Rabbit Gets the Bib
            </Heading>
          </CardHeader>
          <Image
            removeWrapper
            alt="Relaxing app background"
            className="z-0 w-full h-full object-cover"
            src="dashboard/NewMeetPoint.jpg"
          />
          <CardFooter className="absolute bg-black/20 bottom-0 z-10 border-t-1 border-default-600 dark:border-default-100">
            <div className="flex flex-grow items-center">
              <div className="flex flex-col">
                <Text variant='smheading' className="pl-1 pr-1 text-white/90 bg-black/30">🚨 Rally Point 🚨</Text>
                <Text variant='xsheading' className="pl-1 pr-1 text-white/90 bg-black/30"> Meet here at 0600AM Daily</Text>
              </div>
            </div>
            <Button className='bg-button-dashboard-bg hover:bg-button-dashboard-hover text-button-dashboard-text' radius="sm" size="sm">
              <Link
                isExternal
                className="bg-button-dashboard-bg hover:bg-button-dashboard-hover text-button-dashboard-text"
                href="https://www.openstreetmap.org/directions?route=36.135189%2C-115.158541%3B#map=19/36.134813/-115.158776"
              >
                Open Street Map
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card isFooterBlurred className="w-full h-[300px] col-span-12 sm:col-span-4">
          <CardHeader className="absolute z-10 top-1 flex-col items-start">
            <Heading level={6} className="text-white/60 bg-black/60 font-bold">
              FIND OTHER RUNNERS
            </Heading>
            <Heading level={5} className="text-white/90 bg-black/30">
             Stay Connected
            </Heading>
          </CardHeader>
          <Image
            removeWrapper
            alt="Card example background"
            className="z-0 w-full h-full object-cover"
            src="dashboard/SignalConnect.webp"
          />

          <CardFooter className="absolute bg-black/20 bottom-0 z-10 border-t-1 border-default-600 dark:border-default-100">
            <div className="flex flex-grow items-center">
              <div className="flex flex-col ">
                <Text variant='smheading' className='pl-1 pr-1 text-white/90 bg-black/30'>Join Signal Group</Text>
                <Text variant='xsheading' className='pl-1 pr-1 text-white/90 bg-black/30'>Connect with rabbits!</Text>
              </div>
            </div>
            <Button className='bg-button-dashboard-bg hover:bg-button-dashboard-hover text-button-dashboard-text' radius="sm" size="sm">
              <Link
                isExternal
                className="text-white"
                href="https://signal.group/#CjQKIPWdGurSgpzV8xcut1PWo_at1L6hUEFJtHhxLnlAxErEEhB5h5oWXv68P7cgGAGVZ26I"
              >
                Open Signal
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="col-span-12 sm:col-span-4 h-[300px]">
          <CardHeader className="absolute z-10 top-1 flex-col !items-start">
            <p className="text-tiny bg-white/50 text-black/60 uppercase font-bold">
              Participations
            </p>
            <h4 className="text-black bg-white/50 font-medium text-large">
              See your participations
            </h4>
          </CardHeader>
          <Image
            removeWrapper
            alt="Card background"
            className="z-0 w-full h-full object-cover"
            src="dashboard/VegasRunMap.png"
          />
          <CardFooter className="absolute bg-white/50 bottom-0 border-t-1 border-zinc-100/50 z-10 justify-between">
            <div>
              <p className="text-black text-tiny">Review and Track</p>
              <p className="text-black text-tiny">Your Participations</p>
            </div>
            <Button
              className="text-tiny"
              color="primary"
              radius="full"
              size="sm"
            >
              <Link size="sm" className="text-white" href="/p?show=history">
                Activity History
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="col-span-12 sm:col-span-4 h-[300px]">
          <CardHeader className="absolute z-10 top-1 flex-col !items-start">
            <p className="text-tiny text-white/60 bg-black/40 uppercase font-bold">
              Thurdays 4PM
            </p>
            <h4 className="text-white  bg-black/60  font-medium text-large">
              Rebar - Social
            </h4>
          </CardHeader>
          <Image
            removeWrapper
            alt="Card background"
            className="z-0 w-full h-full object-cover"
            src="dashboard/Rebar.jpg"
          />
          <CardFooter className="absolute bg-white/80 bottom-0 border-t-1 border-zinc-100/50 z-10 justify-between">
            <div>
              <p className="text-black text-tiny">Rebar</p>
              <p className="text-black text-tiny">Hang out with Rabbits!</p>
            </div>
            <Button color="primary" radius="full" size="sm">
              <Link
                href="https://google.com/maps?q=Rebar 1225 S Main St, Las Vegas, NV 89104"
                target="_blank"
                className="text-tiny text-white"
              >
                Open Map
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="col-span-12 sm:col-span-4 h-[300px]">
          <CardHeader className="absolute z-10 top-1 flex-col !items-start">
            <p className="text-tiny text-white/60 uppercase font-bold">
              Friday Night
            </p>
            <h4 className="text-white font-medium text-large">
              Double Down Saloon - Social
            </h4>
          </CardHeader>
          <Image
            removeWrapper
            alt="Card background"
            className="z-0 w-full h-full object-cover"
            src="dashboard/DoubleDownSaloon.jpg"
          />
          <CardFooter className="absolute bg-white/80 bottom-0 border-t-1 border-zinc-100/50 z-10 justify-between">
            <div>
              <p className="text-black text-tiny">Double Down Saloon</p>
              <p className="text-black text-tiny">Hang out with Rabbits!</p>
            </div>
            <Button color="primary" radius="full" size="sm">
              <Link
                href="https://google.com/maps?q=Double Down Saloon 4640 Paradise Rd, Las Vegas, NV 89169"
                target="_blank"
                className="text-tiny text-white"
              >
                Open Map
              </Link>
            </Button>
          </CardFooter>
        </Card>

      </div>
    </>
  );
}
