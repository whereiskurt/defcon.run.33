"use client"
import {addToast, Button, Input, Link, ToastProvider } from "@heroui/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { FaDiscord, FaGithub } from "react-icons/fa"
import { FaMobileScreenButton } from "react-icons/fa6"
import { MdOutlineMarkEmailRead } from "react-icons/md"
import React from "react"

export default function EmailLogin() {
  const router = useRouter()
  // const searchParams = useSearchParams();
  const [email, setEmail] = useState<string>('');
  const [code, setCode] = useState<string>("")

  useEffect(() => {
    // const emailQuery = searchParams.get('email')?.replace(" ", "%2B").replace("+","%2B");
    // setEmail(emailQuery || '');

    addToast({
      title: 'Email Sent',
      description: 'You should receive an email with a magic link shortly.',
      color: 'success',
      variant:"flat"
    });

  }, []);

  const handleValidation = (e:any) => {
    e.preventDefault();
    const url = `/api/auth/callback/nodemailer?token=${code}&email=${email}&callbackUrl=/welcome`;
    window.location.href = url; // This will perform a full page reload
  };
  
  return (
    <div>
      <ToastProvider placement="top-center" />
      <div className="min-h-screen flex flex-col items-center text-center px-4">
        <MdOutlineMarkEmailRead className="text-green-500" size={48} /><h2 className="text-center text-3xl font-extrabold">
         Email Queued
        </h2>
        <p className="pt-4 pl-4 w-96 text-center text-2xl">You will receive an email shortly.</p>
        <p className="pt-4 pl-4 w-96 text-left">&apos;<code>{email.replace("%2B","+")}</code>&quot; will receive an email from &quot;<code>no-reply@auth.defcon.run</code>&quot;</p>
        <form>
        <Input isRequired={true} className="m-2 w-96 pt-4" variant="bordered" size="lg" value={code} onChange={(e) => setCode(e.target.value)} name="code" type="code" label="Code" placeholder="XXXXXX" />
        <Button className="mt-2" type="submit" variant="solid" color="primary" onClick={handleValidation} ><FaMobileScreenButton size={24} />Validate</Button>
        </form>
        <p className="w-96 text-left pt-9 pl-4">Or! Use <Link size="lg" href="#">
          &nbsp; <FaDiscord />Discord</Link> or
          <Link size="lg" href="#">
            &nbsp; <FaGithub />Github
          </Link> to authenticate an email address.
        </p>
      </div>
    </div>
  );
}