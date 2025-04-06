"use client"
import { Button, Input } from "@heroui/react"
import { log } from "console"
import { getCsrfToken } from "next-auth/react"
import { useEffect, useState } from "react"
import { FiLogIn } from "react-icons/fi"
import { MdMail, MdPassword } from "react-icons/md"

export default function SignInPage() {
  const [email, setEmail] = useState<string>("")
  const [inviteCode, setInviteCode] = useState<string>("")
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<boolean>(false)
  
  // useEffect(() => {
  //   const fetchCsrfToken = async () => {
  //     const token = await getCsrfToken()
  //     console.log("CSRF Token: ", token)
  //     setCsrfToken(token)
  //   }
  //   fetchCsrfToken();
  //   setPending(false)
  // }, [])
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!csrfToken || csrfToken === '') {
      setError("CSRF token handled or set properly.")
      return
    }
    if (!email || email === '') {
      setError("Provide an email to receive 🪄 magic link.")
      return
    }
    if (!inviteCode || inviteCode === '') {
      setError("Provide the invite code.")
      return
    }
    try {
      setPending(true)
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inviteCode, email, csrfToken }),
      })
      if (!res.ok || res.status != 200) {
        const errorData = await res.json()
        throw new Error(errorData.error)
      } else {
        window.location.href = `/auth/verify?email=${email}`; // This will perform a full page reload
      }
    } catch (error: any) {
      setError(error.message)
      setPending(false)
    }
    return false
  }
  
  return (
    <div>
      <div className="flex flex-col items-center text-center px-4">
        <h2 className="text-center text-3xl font-extrabold">
        We don&apos;t store passwords.
        </h2>
        
        <p className="pt-4 pl-4 w-96 text-left text-xl">Receive a 🪄 magic link 🪄 to an email address you have access to:</p>
        <form onSubmit={handleSubmit}>
          <Input isDisabled={pending} isRequired={true} className="m-2 w-96 p-2" variant="bordered" size="lg" value={email} onChange={(e) => { setEmail(e.target.value) }} name="email" type="email" label="Email" placeholder="someone@somewhere.com" startContent={
            <MdMail className="pt-2 text-2xl text-default-400 pointer-events-none flex-shrink-0" />
          } />
          <Input isDisabled={pending} isRequired={true} className="m-2 w-96 p-2" variant="bordered" size="lg" value={inviteCode} onChange={(e) => { setInviteCode(e.target.value) }} name="inviteCode" type="inviteCode" label="Invite Code" placeholder="Ask on Signal or Discord!" startContent={
            <MdPassword className="pt-2 text-2xl text-default-400 pointer-events-none flex-shrink-0" />
          } />
          {error && <p className="error text-red-600" >{error}</p>}
          <Button isDisabled={pending} className="mt-2" type="submit" variant="solid" color="primary" ><FiLogIn size={24} />Send Email!</Button>
        </form>
      </div>
    </div>
  )
}