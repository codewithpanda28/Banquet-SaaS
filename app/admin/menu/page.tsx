'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/admin/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, Edit, Trash2, Image as ImageIcon, Star, Flame } from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { MenuCategory, MenuItem } from '@/types'
import { toast } from 'sonner'

export default function MenuPage() {
    const [categories, setCategories] = useState<MenuCategory[]>([])
    const [items, setItems] = useState<MenuItem[]>([])
    const [filteredItems, setFilteredItems] = useState<MenuItem[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')

    // Dialog states
    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
    const [itemDialogOpen, setItemDialogOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null)
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null)

    // Form states
    const [categoryForm, setCategoryForm] = useState({ name: '', description: '' })
    const [itemForm, setItemForm] = useState({
        category_id: '',
        name: '',
        description: '',
        price: '',
        image_url: '',
        is_veg: true,
        is_bestseller: false,
        is_available: true,
        is_spicy: false,
        spicy_level: 0,
    })

    useEffect(() => {
        fetchData()
    }, [])

    useEffect(() => {
        filterItems()
    }, [items, searchTerm, selectedCategory])

    async function fetchData() {
        try {
            setLoading(true)

            // Fetch categories
            const { data: cats } = await supabase
                .from('menu_categories')
                .select('*')
                .eq('restaurant_id', RESTAURANT_ID)
                .order('sort_order')

            // Fetch menu items
            const { data: menuItems } = await supabase
                .from('menu_items')
                .select('*')
                .eq('restaurant_id', RESTAURANT_ID)
                .order('name')

            setCategories(cats || [])
            setItems(menuItems || [])
        } catch (error) {
            console.error('Error fetching menu data:', error)
            toast.error('Failed to load menu data')
        } finally {
            setLoading(false)
        }
    }

    function filterItems() {
        let filtered = [...items]

        if (selectedCategory !== 'all') {
            filtered = filtered.filter(item => item.category_id === selectedCategory)
        }

        if (searchTerm) {
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.description?.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        setFilteredItems(filtered)
    }

    async function handleSaveCategory() {
        try {
            if (!categoryForm.name.trim()) {
                toast.error('Please enter category name')
                return
            }

            if (editingCategory) {
                const { error } = await supabase
                    .from('menu_categories')
                    .update({
                        name: categoryForm.name,
                        description: categoryForm.description,
                    })
                    .eq('id', editingCategory.id)

                if (error) throw error
                toast.success('Category updated successfully')
            } else {
                const { error } = await supabase
                    .from('menu_categories')
                    .insert({
                        restaurant_id: RESTAURANT_ID,
                        name: categoryForm.name,
                        description: categoryForm.description,
                        sort_order: categories.length,
                        is_active: true,
                    })

                if (error) throw error
                toast.success('Category added successfully')
            }

            setCategoryDialogOpen(false)
            setCategoryForm({ name: '', description: '' })
            setEditingCategory(null)
            fetchData()
        } catch (error) {
            console.error('Error saving category:', error)
            toast.error('Failed to save category')
        }
    }

    async function handleSaveItem() {
        try {
            if (!itemForm.name.trim() || !itemForm.category_id || !itemForm.price) {
                toast.error('Please fill all required fields')
                return
            }

            const itemData = {
                restaurant_id: RESTAURANT_ID,
                category_id: itemForm.category_id,
                name: itemForm.name,
                description: itemForm.description,
                price: parseFloat(itemForm.price),
                image_url: itemForm.image_url || null,
                is_veg: itemForm.is_veg,
                is_bestseller: itemForm.is_bestseller,
                is_available: itemForm.is_available,
                is_spicy: itemForm.is_spicy,
                spicy_level: itemForm.spicy_level,
                is_new: false,
                preparation_time: 15,
            }

            if (editingItem) {
                const { error } = await supabase
                    .from('menu_items')
                    .update(itemData)
                    .eq('id', editingItem.id)

                if (error) throw error
                toast.success('Menu item updated successfully')
            } else {
                const { error } = await supabase
                    .from('menu_items')
                    .insert(itemData)

                if (error) throw error
                toast.success('Menu item added successfully')
            }

            setItemDialogOpen(false)
            setItemForm({
                category_id: '',
                name: '',
                description: '',
                price: '',
                image_url: '',
                is_veg: true,
                is_bestseller: false,
                is_available: true,
                is_spicy: false,
                spicy_level: 0,
            })
            setEditingItem(null)
            fetchData()
        } catch (error) {
            console.error('Error saving item:', error)
            toast.error('Failed to save menu item')
        }
    }

    async function handleDeleteCategory(id: string) {
        if (!confirm('Are you sure you want to delete this category?')) return

        try {
            const { error } = await supabase
                .from('menu_categories')
                .delete()
                .eq('id', id)

            if (error) throw error
            toast.success('Category deleted successfully')
            fetchData()
        } catch (error) {
            console.error('Error deleting category:', error)
            toast.error('Failed to delete category')
        }
    }

    async function handleDeleteItem(id: string) {
        if (!confirm('Are you sure you want to delete this item?')) return

        try {
            const { error } = await supabase
                .from('menu_items')
                .delete()
                .eq('id', id)

            if (error) throw error
            toast.success('Menu item deleted successfully')
            fetchData()
        } catch (error) {
            console.error('Error deleting item:', error)
            toast.error('Failed to delete menu item')
        }
    }

    function openEditCategory(category: MenuCategory) {
        setEditingCategory(category)
        setCategoryForm({
            name: category.name,
            description: category.description || '',
        })
        setCategoryDialogOpen(true)
    }

    function openEditItem(item: MenuItem) {
        setEditingItem(item)
        setItemForm({
            category_id: item.category_id,
            name: item.name,
            description: item.description || '',
            price: item.price.toString(),
            image_url: item.image_url || '',
            is_veg: item.is_veg,
            is_bestseller: item.is_bestseller,
            is_available: item.is_available,
            is_spicy: item.is_spicy || false,
            spicy_level: item.spicy_level || 0,
        })
        setItemDialogOpen(true)
    }

    if (loading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="text-muted-foreground">Loading menu...</div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Menu Management"
                description="Manage categories and menu items"
            >
                <Button onClick={() => {
                    setEditingCategory(null)
                    setCategoryForm({ name: '', description: '' })
                    setCategoryDialogOpen(true)
                }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Category
                </Button>
                <Button onClick={() => {
                    setEditingItem(null)
                    setItemForm({
                        category_id: categories[0]?.id || '',
                        name: '',
                        description: '',
                        price: '',
                        image_url: '',
                        is_veg: true,
                        is_bestseller: false,
                        is_available: true,
                        is_spicy: false,
                        spicy_level: 0,
                    })
                    setItemDialogOpen(true)
                }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                </Button>
            </PageHeader>

            {/* Categories Section */}
            <Card>
                <CardContent className="pt-6">
                    <h3 className="mb-4 text-lg font-semibold">Categories ({categories.length})</h3>
                    {categories.length === 0 ? (
                        <div className="flex h-32 items-center justify-center text-muted-foreground">
                            No categories yet. Add your first category!
                        </div>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {categories.map((category) => (
                                <Card key={category.id} className="bg-card border-2 border-muted hover:border-primary/50 transition-all shadow-sm">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h4 className="font-semibold">{category.name}</h4>
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {category.description || 'No description'}
                                                </p>
                                                <Badge variant="outline" className="mt-2">
                                                    {items.filter(i => i.category_id === category.id).length} items
                                                </Badge>
                                            </div>
                                            <div className="flex gap-1 ml-2">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => openEditCategory(category)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleDeleteCategory(category.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Menu Items Section */}
            <div className="space-y-4">
                <Card className="bg-card border-2">
                    <CardContent className="pt-6">
                        <div className="flex flex-col gap-4 md:flex-row">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search menu items..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger className="w-full md:w-48">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-3">
                    <h3 className="text-lg font-semibold">
                        Menu Items ({filteredItems.length})
                    </h3>

                    {filteredItems.length === 0 ? (
                        <Card className="bg-card border-2">
                            <CardContent className="flex h-32 items-center justify-center">
                                <p className="text-muted-foreground">No menu items found</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredItems.map((item) => (
                                <Card key={item.id} className="bg-card border-2 border-muted hover:border-primary/50 transition-all shadow-sm">
                                    <CardContent className="p-4">
                                        <div className="flex gap-4">
                                            <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden border">
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start gap-2 mb-2">
                                                    <h4 className="font-semibold flex-1 line-clamp-1">{item.name}</h4>
                                                    {item.is_veg ? (
                                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                            Veg
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                                            Non-Veg
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                                    {item.description || 'No description'}
                                                </p>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-lg font-bold text-primary">
                                                        ₹{item.price}
                                                    </p>
                                                    <div className="flex gap-1">
                                                        {item.is_bestseller && (
                                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                                                <Star className="h-3 w-3 mr-1" />
                                                                Best
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 mt-3">
                                                    <Badge variant={item.is_available ? 'default' : 'destructive'}>
                                                        {item.is_available ? 'Available' : 'Unavailable'}
                                                    </Badge>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => openEditItem(item)}
                                                    >
                                                        <Edit className="h-3 w-3 mr-1" />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDeleteItem(item.id)}
                                                    >
                                                        <Trash2 className="h-3 w-3 text-destructive" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Category Dialog */}
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingCategory ? 'Edit Category' : 'Add Category'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingCategory ? 'Update category details' : 'Create a new menu category'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="cat-name">Category Name *</Label>
                            <Input
                                id="cat-name"
                                value={categoryForm.name}
                                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                placeholder="e.g., Starters, Main Course"
                            />
                        </div>
                        <div>
                            <Label htmlFor="cat-desc">Description</Label>
                            <Textarea
                                id="cat-desc"
                                value={categoryForm.description}
                                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                placeholder="Brief description of this category"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveCategory}>
                            {editingCategory ? 'Update' : 'Add'} Category
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Menu Item Dialog */}
            <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingItem ? 'Update menu item details' : 'Create a new menu item'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="item-name">Item Name *</Label>
                                <Input
                                    id="item-name"
                                    value={itemForm.name}
                                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                                    placeholder="e.g., Paneer Tikka"
                                />
                            </div>
                            <div>
                                <Label htmlFor="item-category">Category *</Label>
                                <Select
                                    value={itemForm.category_id}
                                    onValueChange={(value) => setItemForm({ ...itemForm, category_id: value })}
                                >
                                    <SelectTrigger id="item-category">
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="item-desc">Description</Label>
                            <Textarea
                                id="item-desc"
                                value={itemForm.description}
                                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                                placeholder="Brief description of the item"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="item-price">Price (₹) *</Label>
                                <Input
                                    id="item-price"
                                    type="number"
                                    step="0.01"
                                    value={itemForm.price}
                                    onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <Label htmlFor="item-type">Food Type</Label>
                                <Select
                                    value={itemForm.is_veg ? 'veg' : 'non-veg'}
                                    onValueChange={(value) => setItemForm({ ...itemForm, is_veg: value === 'veg' })}
                                >
                                    <SelectTrigger id="item-type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="veg">Vegetarian</SelectItem>
                                        <SelectItem value="non-veg">Non-Vegetarian</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="item-image">Image URL</Label>
                            <Input
                                id="item-image"
                                value={itemForm.image_url}
                                onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
                                placeholder="https://example.com/image.jpg"
                            />
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="bestseller"
                                    checked={itemForm.is_bestseller}
                                    onChange={(e) => setItemForm({ ...itemForm, is_bestseller: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                                <Label htmlFor="bestseller">Bestseller</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="spicy"
                                    checked={itemForm.is_spicy}
                                    onChange={(e) => setItemForm({ ...itemForm, is_spicy: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                                <Label htmlFor="spicy">Spicy</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="available"
                                    checked={itemForm.is_available}
                                    onChange={(e) => setItemForm({ ...itemForm, is_available: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                                <Label htmlFor="available">Available</Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setItemDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveItem}>
                            {editingItem ? 'Update' : 'Add'} Item
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
