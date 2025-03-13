"use client"

import type React from "react"

import { useState } from "react"
import { storage, db } from "@/lib/firebase-config"
import { ref, uploadBytes } from "firebase/storage"
import { collection, addDoc } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import AdminCheck from "@/components/admin-check"
import { v4 as uuidv4 } from "uuid"
import Image from "next/image"

export default function UploadPage() {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [type, setType] = useState<"regular" | "challenge">("regular")
  const [icon, setIcon] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)

      // Crear URL para previsualización
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          setPreview(e.target.result as string)
        }
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name || !description || !price || !type) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      // Datos del item
      const itemData: any = {
        name,
        description,
        price: Number.parseInt(price),
        type,
        createdAt: new Date(),
      }

      // Si hay un icono seleccionado
      if (icon) {
        itemData.icon = icon
      }

      // Si hay un archivo para subir
      if (file) {
        // Crear un nombre único para el archivo
        const fileExtension = file.name.split(".").pop()
        const fileName = `${uuidv4()}.${fileExtension}`
        const storageRef = ref(storage, `items/${fileName}`)

        // Subir el archivo
        await uploadBytes(storageRef, file)

        // Guardar la ruta en el item
        itemData.image = `items/${fileName}`
      }

      // Guardar en Firestore
      await addDoc(collection(db, "items"), itemData)

      toast({
        title: "Éxito",
        description: "Item creado correctamente",
      })

      // Limpiar formulario
      setName("")
      setDescription("")
      setPrice("")
      setType("regular")
      setIcon("")
      setFile(null)
      setPreview(null)
    } catch (error) {
      console.error("Error al crear item:", error)
      toast({
        title: "Error",
        description: "No se pudo crear el item. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Administración de Items</h1>

      <AdminCheck>
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Crear Nuevo Item</CardTitle>
            <CardDescription>Añade un nuevo item a la tienda</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Item</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Precio (monedas)</Label>
                <Input
                  id="price"
                  type="number"
                  min="1"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Item</Label>
                <Select value={type} onValueChange={(value: "regular" | "challenge") => setType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="challenge">Desafío</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="icon">Icono (opcional)</Label>
                <Select value={icon} onValueChange={setIcon}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un icono" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguno</SelectItem>
                    <SelectItem value="gift">Regalo</SelectItem>
                    <SelectItem value="trophy">Trofeo</SelectItem>
                    <SelectItem value="shopping">Compras</SelectItem>
                    <SelectItem value="party">Fiesta</SelectItem>
                    <SelectItem value="music">Música</SelectItem>
                    <SelectItem value="ticket">Ticket</SelectItem>
                    <SelectItem value="sparkles">Destellos</SelectItem>
                    <SelectItem value="game">Juego</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Imagen (opcional)</Label>
                <Input id="image" type="file" accept="image/*" onChange={handleFileChange} />

                {preview && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">Vista previa:</p>
                    <div className="relative h-48 w-full bg-muted rounded-md overflow-hidden">
                      <Image src={preview || "/placeholder.svg"} alt="Vista previa" fill className="object-contain" />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Creando..." : "Crear Item"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </AdminCheck>
    </main>
  )
}

