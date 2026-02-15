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
import { Plus, Search, Edit, Trash2, Image as ImageIcon, Star, Flame, UtensilsCrossed, ArrowRight } from 'lucide-react'
import { supabase, RESTAURANT_ID } from '@/lib/supabase'
import { MenuCategory, MenuItem } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-muted-foreground animate-pulse font-medium">Loading Menu...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader
                title="Menu Management"
                description="Organize your food catalogue with style"
            >
                <div className="flex gap-2">
                    <Button onClick={() => {
                        setEditingCategory(null)
                        setCategoryForm({ name: '', description: '' })
                        setCategoryDialogOpen(true)
                    }} variant="outline" className="glass-panel hover:bg-white/20 border-primary/20 bg-primary/5">
                        <Plus className="mr-2 h-4 w-4 text-primary" />
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
                    }} className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                        <Plus className="mr-2 h-4 w-4" />
                        Add New Item
                    </Button>
                </div>
            </PageHeader>

            {/* Categories Section */}
            <div>
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <UtensilsCrossed className="h-4 w-4 text-primary" /> Categories
                    </h3>
                    <Badge variant="secondary">{categories.length}</Badge>
                </div>
                {categories.length === 0 ? (
                    <div className="glass-panel p-8 text-center rounded-2xl border-dashed">
                        <p className="text-muted-foreground mb-2">No categories yet</p>
                        <Button variant="link" onClick={() => setCategoryDialogOpen(true)}>Create your first category</Button>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {categories.map((category) => (
                            <div key={category.id} className="glass-card p-5 rounded-xl border border-white/5 relative group cursor-pointer hover:border-primary/40 transition-all">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{category.name}</h4>
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{category.description || 'No description'}</p>
                                    </div>
                                    <div className="bg-secondary/50 rounded-lg px-2 py-1 text-[10px] font-bold">
                                        {items.filter(i => i.category_id === category.id).length} ITEMS
                                    </div>
                                </div>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                    <Button size="icon" variant="secondary" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); openEditCategory(category); }}>
                                        <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button size="icon" variant="destructive" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category.id); }}>
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Menu Items Section */}
            <div className="space-y-4">
                <Card className="glass-panel border-0 mb-6">
                    <CardContent className="pt-6">
                        <div className="flex flex-col gap-4 md:flex-row items-end">
                            <div className="relative flex-1 w-full">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Search Menu</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Find burgers, pizzas..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 bg-background/50 border-input/50 focus:bg-background transition-all"
                                    />
                                </div>
                            </div>
                            <div className="w-full md:w-56">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Filter Category</Label>
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger className="bg-background/50 border-input/50">
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
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-3">
                    <h3 className="text-lg font-bold px-1">Menu Items ({filteredItems.length})</h3>

                    {filteredItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 glass-panel rounded-3xl border-dashed">
                            <UtensilsCrossed className="h-12 w-12 text-muted-foreground/20 mb-3" />
                            <p className="text-muted-foreground">No menu items found matching criteria</p>
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {filteredItems.map((item) => (
                                <div key={item.id} className="group relative bg-card/40 hover:bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                                    {/* Image Area */}
                                    <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center bg-secondary/30">
                                                <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                                            </div>
                                        )}
                                        <div className="absolute top-3 left-3 flex flex-col gap-2">
                                            <Badge className={cn("backdrop-blur-md border shadow-sm", item.is_veg ? "bg-green-500/90 text-white border-green-400" : "bg-red-500/90 text-white border-red-400")}>
                                                <div className={cn("mr-1.5 h-1.5 w-1.5 rounded-full ring-1 ring-white", item.is_veg ? "bg-green-200" : "bg-red-200")} />
                                                {item.is_veg ? 'VEG' : 'NON-VEG'}
                                            </Badge>
                                            {item.is_bestseller && (
                                                <Badge className="bg-amber-500/90 text-white border-amber-400 backdrop-blur-md shadow-sm">
                                                    <Star className="h-3 w-3 mr-1 fill-white" /> BESTSELLER
                                                </Badge>
                                            )}
                                        </div>

                                        {!item.is_available && (
                                            <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] flex items-center justify-center pointer-events-none z-10">
                                                <span className="bg-red-500 text-white px-3 py-1 font-bold rounded-lg shadow-lg transform -rotate-12 border-2 border-white">SOLD OUT</span>
                                            </div>
                                        )}

                                        {/* Hover Actions */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px]">
                                            <Button size="icon" variant="secondary" className="rounded-full h-10 w-10 shadow-lg hover:scale-110 transition-transform" onClick={() => openEditItem(item)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="destructive" className="rounded-full h-10 w-10 shadow-lg hover:scale-110 transition-transform" onClick={() => handleDeleteItem(item.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Content Area */}
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-lg leading-tight line-clamp-1 pr-2">{item.name}</h4>
                                            <span className="font-black text-lg text-primary">₹{item.price}</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2 h-10 mb-4 leading-relaxed">
                                            {item.description || 'A delicious preparation with authentic spices.'}
                                        </p>

                                        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground pt-3 border-t border-border/50">
                                            <span className="flex items-center gap-1.5">
                                                <div className={cn("h-2 w-2 rounded-full animate-pulse", item.is_available ? "bg-green-500" : "bg-red-500")} />
                                                {item.is_available ? 'Available' : 'Sold Out'}
                                            </span>
                                            {item.is_spicy && (
                                                <span className="flex items-center text-orange-500 font-bold" title="Spicy">
                                                    <Flame className="h-3.5 w-3.5 mr-0.5 fill-orange-500" /> Spicy
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Category Dialog */}
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                <DialogContent className="glass-panel border border-white/10 bg-background/95 backdrop-blur-xl sm:rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">
                            {editingCategory ? 'Edit Category' : 'New Category'}
                        </DialogTitle>
                        <DialogDescription>
                            Organize your menu items efficiently
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="cat-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category Name</Label>
                            <Input
                                id="cat-name"
                                value={categoryForm.name}
                                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                placeholder="e.g. Starters, Main Course"
                                className="bg-secondary/20 border-border/50 h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cat-desc" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
                            <Textarea
                                id="cat-desc"
                                value={categoryForm.description}
                                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                placeholder="Helping customers understand what's in this section..."
                                className="bg-secondary/20 border-border/50 min-h-[100px] resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setCategoryDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveCategory} className="bg-primary font-bold shadow-lg shadow-primary/20">
                            {editingCategory ? 'Save Changes' : 'Create Category'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Menu Item Dialog */}
            <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
                <DialogContent className="max-w-2xl glass-panel border border-white/10 bg-background/95 backdrop-blur-xl sm:rounded-3xl overflow-hidden p-0 gap-0">
                    <div className="bg-muted/30 px-6 py-4 border-b border-border/50">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            {editingItem ? <Edit className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
                            {editingItem ? 'Edit Menu Item' : 'Add New Dish'}
                        </DialogTitle>
                        <DialogDescription>
                            Detailed information about this menu item
                        </DialogDescription>
                    </div>

                    <div className="p-6 grid gap-6 max-h-[70vh] overflow-y-auto">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="item-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Item Name *</Label>
                                <Input
                                    id="item-name"
                                    value={itemForm.name}
                                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                                    placeholder="e.g. Butter Chicken"
                                    className="bg-secondary/20 border-border/50 h-10"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="item-category" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category *</Label>
                                <Select
                                    value={itemForm.category_id}
                                    onValueChange={(value) => setItemForm({ ...itemForm, category_id: value })}
                                >
                                    <SelectTrigger id="item-category" className="bg-secondary/20 border-border/50 h-10">
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

                        <div className="space-y-2">
                            <Label htmlFor="item-desc" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
                            <Textarea
                                id="item-desc"
                                value={itemForm.description}
                                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                                placeholder="Describe the dish - ingredients, preparation style..."
                                className="bg-secondary/20 border-border/50 min-h-[80px] resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="item-price" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Price (₹) *</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
                                    <Input
                                        id="item-price"
                                        type="number"
                                        step="0.01"
                                        value={itemForm.price}
                                        onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                                        placeholder="0.00"
                                        className="bg-secondary/20 border-border/50 h-10 pl-8 font-mono"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="item-type" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dietary Type</Label>
                                <Select
                                    value={itemForm.is_veg ? 'veg' : 'non-veg'}
                                    onValueChange={(value) => setItemForm({ ...itemForm, is_veg: value === 'veg' })}
                                >
                                    <SelectTrigger id="item-type" className="bg-secondary/20 border-border/50 h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="veg">
                                            <div className="flex items-center gap-2">
                                                <div className="h-3 w-3 rounded-full bg-green-500 ring-1 ring-green-200" /> Vegetarian
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="non-veg">
                                            <div className="flex items-center gap-2">
                                                <div className="h-3 w-3 rounded-full bg-red-500 ring-1 ring-red-200" /> Non-Vegetarian
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="item-image" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Image URL (Optional)</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="item-image"
                                    value={itemForm.image_url}
                                    onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
                                    placeholder="https://example.com/image.jpg"
                                    className="bg-secondary/20 border-border/50 h-10 flex-1"
                                />
                                {itemForm.image_url && (
                                    <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted border border-border shrink-0">
                                        <img src={itemForm.image_url} className="h-full w-full object-cover" alt="Preview" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3 pt-2 border-t border-border/50">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Settings & Flags</Label>
                            <div className="flex flex-wrap gap-4">
                                <label className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-secondary/10 cursor-pointer hover:bg-secondary/20 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={itemForm.is_bestseller}
                                        onChange={(e) => setItemForm({ ...itemForm, is_bestseller: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300 accent-primary"
                                    />
                                    <span className="text-sm font-medium">✨ Bestseller</span>
                                </label>
                                <label className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-secondary/10 cursor-pointer hover:bg-secondary/20 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={itemForm.is_spicy}
                                        onChange={(e) => setItemForm({ ...itemForm, is_spicy: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300 accent-orange-500"
                                    />
                                    <span className="text-sm font-medium">🔥 Spicy</span>
                                </label>
                                <label className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-secondary/10 cursor-pointer hover:bg-secondary/20 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={itemForm.is_available}
                                        onChange={(e) => setItemForm({ ...itemForm, is_available: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300 accent-green-500"
                                    />
                                    <span className="text-sm font-medium">✅ Available</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-muted/30 border-t border-border/50 flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setItemDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveItem} className="bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 px-8">
                            {editingItem ? 'Update Item' : 'Add to Menu'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
