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

export default async function Index() {
  const session = await auth();
  if (!session) redirect('/login/auth');
  return (
    <section className="flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold mb-4">Updates</h1>

        <div className="max-w-[900px] gap-2 grid grid-cols-12 grid-rows-2">
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
              src="https://strapi.cms.defcon.run/uploads/Vegas_Run_Map_f987cd6244.png"
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

          <Card
            isFooterBlurred
            className="w-full h-[300px] col-span-12 sm:col-span-8"
          >
            <CardHeader className="absolute z-10 top-1 flex-col items-start">
              <p className="text-tiny text-white/60 bg-black/60  uppercase font-bold">
                Best Morning
              </p>
              <h4 className="text-white/90 font-medium text-xl">
                Early Rabbit Gets the Bib
              </h4>
            </CardHeader>
            <Image
              removeWrapper
              alt="Relaxing app background"
              className="z-0 w-full h-full object-cover"
              src="https://assets.cms.defcon.run/Meet_Point_bd9c2eb8a0.jpg"
            />
            <CardFooter className="absolute bg-black/40 bottom-0 z-10 border-t-1 border-default-600 dark:border-default-100">
              <div className="flex flex-grow gap-2 items-center">
                <Image
                  alt="Breathing app icon"
                  className="rounded-full w-10 h-10 bg-white"
                  src="https://assets.cms.defcon.run/dcjack_4ad07c2493.svg"
                />
                <div className="flex flex-col">
                  <p className="text-tiny text-white/60">🚨 Rally Point 🚨</p>
                  <p className="text-tiny text-white/60">
                    Meet here at 0600AM Daily
                  </p>
                </div>
              </div>
              <Button radius="full" color="primary" size="sm">
                <Link
                  className="text-white"
                  target="_blank"
                  href="https://www.google.com/maps?q=36.13528,-115.15877"
                >
                  Open Map Location
                </Link>
              </Button>
            </CardFooter>
          </Card>

          <Card
            isFooterBlurred
            className="w-full h-[300px] col-span-12 sm:col-span-4"
          >
            <CardHeader className="absolute z-10 top-1 flex-col items-start">
              <p className="text-tiny text-white/60  bg-black/40 uppercase font-bold">
                Find Other Runners
              </p>
              <h4 className="text-white  bg-black/60 font-medium text-2xl">
                Stay Connected
              </h4>
            </CardHeader>
            <Image
              removeWrapper
              alt="Card example background"
              className="z-0 w-full h-full scale-125 -translate-y-6 object-cover"
              src="https://strapi.cms.defcon.run/uploads/Signal_Thumb_c00ef96c05.webp"
            />
            <CardFooter className="absolute bg-white/80 bottom-0 border-t-1 border-zinc-100/50 z-10 justify-between">
              <div>
                <p className="text-black text-tiny">Join the Signal Group</p>
                <p className="text-black text-tiny">Connect with Rabbits!</p>
              </div>
              <Button color="primary" radius="full" size="sm">
                <Link
                  href="https://signal.group/#CjQKIPWdGurSgpzV8xcut1PWo_at1L6hUEFJtHhxLnlAxErEEhB5h5oWXv68P7cgGAGVZ26I"
                  target="_blank"
                  className="text-tiny text-white"
                >
                  Signal Group
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
              src="https://strapi.cms.defcon.run/uploads/rebar_1316d2f9ce.jpg"
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
              src="https://strapi.cms.defcon.run/uploads/doubledown_116691adfe.jpg"
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
    </section>
  );
}
