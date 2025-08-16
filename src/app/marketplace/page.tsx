"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, Star, Video, FileText, Book, Filter } from "lucide-react";

// Define product types for the marketplace
interface MarketplaceProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  image: string;
  category: "course" | "resource" | "template" | "consultation";
  rating: number;
  reviewCount: number;
  instructor?: string;
  duration?: string;
  level?: "beginner" | "intermediate" | "advanced" | "all";
  featured?: boolean;
  bestseller?: boolean;
  new?: boolean;
}

// Sample product data
const products: MarketplaceProduct[] = [
  
];

// Product card component
const ProductCard = ({ product }: { product: MarketplaceProduct }) => {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "course":
        return <Video className="w-4 h-4" />;
      case "resource":
        return <FileText className="w-4 h-4" />;
      case "template":
        return <FileText className="w-4 h-4" />;
      case "consultation":
        return <Book className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-all">
      <div className="relative h-48 bg-muted">
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.title} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-secondary/20">
            {getCategoryIcon(product.category)}
          </div>
        )}
        {product.featured && (
          <Badge className="absolute top-2 right-2 bg-primary">Featured</Badge>
        )}
        {product.bestseller && (
          <Badge className="absolute top-2 right-2 bg-orange-500">Bestseller</Badge>
        )}
        {product.new && (
          <Badge className="absolute top-2 right-2 bg-green-500">New</Badge>
        )}
      </div>
      <CardHeader className="p-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-lg">{product.title}</CardTitle>
            <CardDescription className="line-clamp-2 text-sm">
              {product.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center text-sm text-muted-foreground mb-2">
          <div className="flex items-center">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 mr-1" />
            <span>{product.rating}</span>
            <span className="ml-1">({product.reviewCount})</span>
          </div>
          {product.duration && (
            <span className="ml-auto">{product.duration}</span>
          )}
        </div>
        {product.instructor && (
          <p className="text-sm text-muted-foreground mb-2">By {product.instructor}</p>
        )}
        <div className="flex items-center">
          <Badge variant="secondary" className="mr-2">
            {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
          </Badge>
          <Badge variant="outline">{product.level}</Badge>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <div className="font-bold text-lg">
          {product.price} credits
        </div>
        <Button size="sm">View Details</Button>
      </CardFooter>
    </Card>
  );
};

export default function MarketplacePage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  
  // Filter products based on search term and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        product.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = activeCategory === "all" || product.category === activeCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container max-w-7xl mx-auto py-16 px-4 relative min-h-screen">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none"></div>
      
      <div className="flex flex-col items-center justify-center text-center max-w-4xl mx-auto mb-12 relative z-10">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">Marketplace</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Spend your credits on premium courses, resources, and templates to help you succeed in your academic journey.
        </p>
      </div>
      
      {/* Search and filtering */}
      <div className="relative z-10 mb-10">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search for courses, resources, and more..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter:</span>
            <Button 
              variant={activeCategory === "all" ? "default" : "outline"} 
              size="sm"
              onClick={() => setActiveCategory("all")}
            >
              All
            </Button>
            <Button 
              variant={activeCategory === "course" ? "default" : "outline"} 
              size="sm"
              onClick={() => setActiveCategory("course")}
            >
              Courses
            </Button>
            <Button 
              variant={activeCategory === "resource" ? "default" : "outline"} 
              size="sm"
              onClick={() => setActiveCategory("resource")}
            >
              Resources
            </Button>
          </div>
        </div>
      </div>
      
      {/* Tabs for different product categories */}
      <Tabs defaultValue="featured" className="relative z-10 mb-12">
        <TabsList className="mb-6">
          <TabsTrigger value="featured">Featured</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="resources">Resources & Templates</TabsTrigger>
          <TabsTrigger value="consultations">Consultations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="featured">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts
              .filter(product => product.featured)
              .map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
          </div>
        </TabsContent>
        
        <TabsContent value="courses">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts
              .filter(product => product.category === "course")
              .map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
          </div>
        </TabsContent>
        
        <TabsContent value="resources">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts
              .filter(product => product.category === "resource" || product.category === "template")
              .map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
          </div>
        </TabsContent>
        
        <TabsContent value="consultations">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts
              .filter(product => product.category === "consultation")
              .map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Main product grid */}
      <div className="relative z-10">
        <h2 className="text-2xl font-bold mb-6">All Products</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.length > 0 ? (
            filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))
          ) : (
            <div className="col-span-4 py-12 text-center text-muted-foreground">
              No products found matching your search criteria.
            </div>
          )}
        </div>
      </div>
      
      {/* Informational section */}
      <div className="relative z-10 mt-20 max-w-3xl mx-auto bg-card/80 backdrop-blur-sm border border-border/40 rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-4">How to Use the Marketplace</h2>
        <p className="text-muted-foreground mb-4">
          Browse our selection of premium educational content and resources designed to help you excel in your academic journey.
          Purchase items using your credits, which you can buy from our Credits page.
        </p>
        <ul className="space-y-2 text-muted-foreground list-disc pl-5 mb-6">
          <li>All purchases are permanent and can be accessed anytime</li>
          <li>Courses include lifetime access to all future updates</li>
          <li>Resources can be downloaded immediately after purchase</li>
          <li>Consultations will be scheduled based on tutor availability</li>
        </ul>
        <div className="flex justify-center">
          <Button variant="outline" asChild>
            <a href="/credits">Need more credits? Purchase here</a>
          </Button>
        </div>
      </div>
    </div>
  );
} 