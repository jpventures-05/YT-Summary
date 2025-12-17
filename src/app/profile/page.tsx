'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Upload, User, Save, ArrowLeft, LogOut } from "lucide-react"
import Link from 'next/link'

export default function ProfilePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [user, setUser] = useState<any>(null)

    // Profile Fields
    const [username, setUsername] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [phone, setPhone] = useState('')
    const [state, setState] = useState('')
    const [city, setCity] = useState('')
    const [recoveryEmail, setRecoveryEmail] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')

    const fileInputRef = useRef<HTMLInputElement>(null)

    // Check Auth & Fetch Profile
    useEffect(() => {
        const getProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/login')
                return
            }
            setUser(user)

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (data) {
                setUsername(data.username || '')
                setFirstName(data.first_name || '')
                setLastName(data.last_name || '')
                setPhone(data.phone || '')
                setState(data.state || '')
                setCity(data.city || '')
                setRecoveryEmail(data.recovery_email || '')
                setAvatarUrl(data.avatar_url || '')
            } else {
                // Should exist due to trigger, but fallback if older user
            }
            setLoading(false)
        }
        getProfile()
    }, [router])

    // Update Profile
    const handleUpdate = async () => {
        setUpdating(true)
        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                username: username,
                first_name: firstName,
                last_name: lastName,
                phone,
                state,
                city,
                recovery_email: recoveryEmail,
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString()
            })

        if (error) {
            if (error.code === '23505') {
                alert('Username is already taken. Please choose another one.')
            } else {
                alert('Error updating profile: ' + error.message)
            }
        } else {
            alert('Profile updated successfully!')
        }
        setUpdating(false)
    }

    // Handle File Upload
    const handleUploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            if (!event.target.files || event.target.files.length === 0) {
                return
            }
            const file = event.target.files[0]
            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}-${Math.random()}.${fileExt}`
            const filePath = `${fileName}`

            setUpdating(true)

            // Upload
            let { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) {
                throw uploadError
            }

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
            setAvatarUrl(publicUrl)

            // Save immediately or wait for manual save? 
            // Often nice to save avatar URL immediately so it sticks even if they forget 'Save'
            // But let's just set state and let user click 'Save Changes' to commit everything at once?
            // Actually, better to persist avatar immediately to avoid confusion.

            await supabase.from('profiles').upsert({
                id: user.id,
                avatar_url: publicUrl,
                updated_at: new Date().toISOString()
            })

        } catch (error: any) {
            alert('Error uploading avatar: ' + error.message)
        } finally {
            setUpdating(false)
        }
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    if (loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <main className="container max-w-2xl mx-auto py-8">
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/channels">
                            <Button variant="ghost" size="icon"><ArrowLeft /></Button>
                        </Link>
                        <h1 className="text-3xl font-bold">Profile Settings</h1>
                    </div>
                    <Button variant="destructive" onClick={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" /> Sign Out
                    </Button>
                </div>

                <div className="grid gap-6">
                    {/* Identity Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Identity</CardTitle>
                            <CardDescription>Manage your public profile and avatar.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-6 sm:flex-row">
                            <div className="flex flex-col items-center gap-3">
                                <Avatar className="h-24 w-24 border-2 border-border">
                                    <AvatarImage src={avatarUrl} />
                                    <AvatarFallback className="text-xl bg-muted"><User /></AvatarFallback>
                                </Avatar>
                                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                    <Upload className="mr-2 h-4 w-4" /> Change Picture
                                </Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleUploadAvatar}
                                />
                            </div>
                            <div className="flex-1 w-full space-y-4">
                                <div className="space-y-2">
                                    <Label>Username</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">@</span>
                                        <Input className="pl-7" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))} placeholder="username" />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Unique handle (letters, numbers, underscores).</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>First Name</Label>
                                        <Input value={firstName} onChange={e => setFirstName(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Last Name</Label>
                                        <Input value={lastName} onChange={e => setLastName(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input value={user.email} disabled className="bg-muted" />
                                    <p className="text-xs text-muted-foreground">Managed via Login provider</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contact Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Contact Information</CardTitle>
                            <CardDescription>How we can reach you.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Phone Number</Label>
                                <Input value={phone} onChange={e => setPhone(e.target.value)} type="tel" />
                            </div>
                            <div className="space-y-2">
                                <Label>Recovery Email</Label>
                                <Input value={recoveryEmail} onChange={e => setRecoveryEmail(e.target.value)} type="email" placeholder="backup@example.com" />
                                <p className="text-xs text-muted-foreground">Used for account recovery if you lose access to your main email.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>City</Label>
                                    <Input value={city} onChange={e => setCity(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>State</Label>
                                    <Input value={state} onChange={e => setState(e.target.value)} />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end border-t bg-muted/20 py-4">
                            <Button onClick={handleUpdate} disabled={updating}>
                                {updating && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                                <Save className="mr-2 h-4 w-4" /> Save Changes
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </main>
        </div>
    )
}
