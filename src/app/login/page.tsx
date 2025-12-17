'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2, Mail, Lock, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react"
import { z } from "zod"

// --- Validation Schemas ---
const strongPasswordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Must contain at least one special character")

const signInSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required")
})

const signUpSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: strongPasswordSchema,
    first_name: z.string().min(2, "First name is required"),
    last_name: z.string().min(2, "Last name is required"),
    phone: z.string().min(10, "Phone number must be valid"),
    state: z.string().min(2, "State is required"),
    city: z.string().min(2, "City is required"),
    recovery_email: z.string().email("Invalid recovery email").optional().or(z.literal(''))
})

type AuthMode = 'signin' | 'signup' | 'forgot_password'

export default function LoginPage() {
    const router = useRouter()

    const [mode, setMode] = useState<AuthMode>('signin')

    // Form State
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    // Extended Profile State
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [phone, setPhone] = useState('')
    const [state, setState] = useState('')
    const [city, setCity] = useState('')
    const [recoveryEmail, setRecoveryEmail] = useState('')

    // UI State
    const [isLoading, setIsLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

    const handleGoogleLogin = async () => {
        setGoogleLoading(true)
        setError('')
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            }
        })
        if (error) {
            setError(error.message)
            setGoogleLoading(false)
        }
    }

    const validateForm = () => {
        setFieldErrors({})
        setError('')

        if (mode === 'signin') {
            const result = signInSchema.safeParse({ email, password })
            if (!result.success) {
                setFieldErrors(result.error.flatten().fieldErrors)
                return false
            }
        } else if (mode === 'signup') {
            const result = signUpSchema.safeParse({
                email, password, first_name: firstName, last_name: lastName, phone, state, city, recovery_email: recoveryEmail
            })
            if (!result.success) {
                setFieldErrors(result.error.flatten().fieldErrors)
                return false
            }
        }
        return true
    }

    const handleAuth = async () => {
        setError('')
        setSuccessMessage('')
        if (!validateForm()) return

        setIsLoading(true)

        try {
            if (mode === 'signup') {
                const { error, data } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                        // Pass extended metadata to trigger profile creation
                        data: {
                            first_name: firstName,
                            last_name: lastName,
                            phone,
                            state,
                            city,
                            recovery_email: recoveryEmail
                        }
                    }
                })

                if (error) throw error

                if (data.user && data.user.identities && data.user.identities.length === 0) {
                    setError("This email is already registered. Try signing in.")
                } else {
                    setSuccessMessage('Confirmation email sent! Please check your inbox.')
                    setMode('signin') // Switch back to sign in to guide them? Or stay? Stay is better but with success msg.
                }

            } else if (mode === 'signin') {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw new Error("Invalid login credentials.")

                router.push('/channels')
                router.refresh()
            } else if (mode === 'forgot_password') {
                if (!email) {
                    setError("Please enter your email.")
                    setIsLoading(false)
                    return
                }
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/auth/callback?next=/profile`,
                    // Redirect to profile or specific update password page
                })
                if (error) throw error
                setSuccessMessage("Password reset link sent to your email (and recovery email if configured).")
            }
        } catch (error: any) {
            setError(error.message || "An unexpected error occurred")
        } finally {
            setIsLoading(false)
        }
    }

    // Render Helper: Input Field
    const renderInput = (
        label: string,
        value: string,
        setValue: (v: string) => void,
        type: string = "text",
        placeholder: string = "",
        errorKey: string,
        optional: boolean = false
    ) => (
        <div className="space-y-1">
            <Label>{label} {optional && <span className="text-muted-foreground font-normal">(Optional)</span>}</Label>
            <Input
                type={type}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                className={fieldErrors[errorKey] ? "border-destructive" : ""}
            />
            {fieldErrors[errorKey] && (
                <p className="text-xs text-destructive">{fieldErrors[errorKey][0]}</p>
            )}
        </div>
    )

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50/50 p-4 py-8">
            <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">
                        {mode === 'signup' ? 'Create Account' : mode === 'forgot_password' ? 'Reset Password' : 'Welcome Back'}
                    </CardTitle>
                    <CardDescription className="text-center">
                        {mode === 'signup' ? "Please fill in your details to register" :
                            mode === 'forgot_password' ? "Enter your email to receive a reset link" :
                                "Enter your credentials to access your account"}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Google Login (Only for SignIn/SignUp) */}
                    {mode !== 'forgot_password' && (
                        <>
                            <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={isLoading || googleLoading}>
                                {googleLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                                        <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                                    </svg>
                                )}
                                {mode === 'signup' ? 'Sign up' : 'Sign in'} with Google
                            </Button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or continue with email</span></div>
                            </div>
                        </>
                    )}

                    {/* Form Fields */}
                    <div className="space-y-4">
                        {mode === 'signup' && (
                            <div className="grid grid-cols-2 gap-4">
                                {renderInput("First Name", firstName, setFirstName, "text", "Jane", "first_name")}
                                {renderInput("Last Name", lastName, setLastName, "text", "Doe", "last_name")}
                            </div>
                        )}

                        {renderInput("Email", email, setEmail, "email", "name@example.com", "email")}

                        {mode === 'signup' && (
                            <>
                                {renderInput("Phone Number", phone, setPhone, "tel", "+1 (555) 000-0000", "phone")}
                                <div className="grid grid-cols-2 gap-4">
                                    {renderInput("City", city, setCity, "text", "San Francisco", "city")}
                                    {renderInput("State", state, setState, "text", "CA", "state")}
                                </div>
                                {renderInput("Recovery Email", recoveryEmail, setRecoveryEmail, "email", "backup@example.com", "recovery_email", true)}
                            </>
                        )}

                        {mode !== 'forgot_password' && (
                            renderInput("Password", password, setPassword, "password", "********", "password")
                        )}

                        {/* Password Requirements Hint */}
                        {mode === 'signup' && (
                            <div className="text-xs text-muted-foreground space-y-1">
                                <p>Password must contain: 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol.</p>
                            </div>
                        )}
                    </div>

                    {/* Messages */}
                    {error && (
                        <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-start gap-2 animate-in fade-in-50">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                    {successMessage && (
                        <div className="bg-green-500/15 text-green-700 dark:text-green-400 text-sm p-3 rounded-md flex items-start gap-2 animate-in fade-in-50">
                            <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    <Button className="w-full mt-4" onClick={handleAuth} disabled={isLoading || googleLoading}>
                        {isLoading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                        {mode === 'signup' ? 'Create Account' : mode === 'forgot_password' ? 'Send Reset Link' : 'Sign In'}
                    </Button>
                </CardContent>

                <CardFooter className="flex flex-col gap-2 justify-center border-t py-4 bg-muted/20">
                    {mode === 'signin' && (
                        <>
                            <Button variant="link" size="sm" onClick={() => { setMode('forgot_password'); setError('') }}>
                                Forgot your password?
                            </Button>
                            <Button variant="link" size="sm" onClick={() => { setMode('signup'); setError('') }}>
                                Don't have an account? Sign Up
                            </Button>
                        </>
                    )}
                    {mode === 'signup' && (
                        <Button variant="link" size="sm" onClick={() => { setMode('signin'); setError('') }}>
                            Already have an account? Sign In
                        </Button>
                    )}
                    {mode === 'forgot_password' && (
                        <Button variant="link" size="sm" onClick={() => { setMode('signin'); setError('') }}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sign In
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    )
}
