"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Trash2, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { addResourceFromAdmin, listResourcesForAdmin, deleteResourceFromAdmin } from './actions';

interface Resource {
  _id: string;
  content: string;
  _creationTime: number;
}

interface AlertState {
  show: boolean;
  type: 'success' | 'error';
  message: string;
}

export default function AdminDashboard() {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<AlertState>({ show: false, type: 'success', message: '' });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; resource: Resource | null }>({
    open: false,
    resource: null
  });

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: 'success', message: '' }), 5000);
  };

  const loadResources = async () => {
    try {
      const result = await listResourcesForAdmin();
      if (result.success && result.resources) {
        setResources(result.resources);
      } else {
        showAlert('error', result.error || 'Failed to load resources');
      }
    } catch (error) {
      showAlert('error', 'Failed to load resources');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isSubmitting) {
        e.preventDefault();
        handleSubmit();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [content, isSubmitting]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      showAlert('error', 'Please enter some content');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await addResourceFromAdmin(content.trim());
      if (result.success) {
        showAlert('success', 'Resource added successfully!');
        setContent('');
        await loadResources();
      } else {
        showAlert('error', result.error || 'Failed to add resource');
      }
    } catch (error) {
      showAlert('error', 'Failed to add resource');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (resource: Resource) => {
    try {
      const result = await deleteResourceFromAdmin(resource._id);
      if (result.success) {
        showAlert('success', 'Resource deleted successfully!');
        await loadResources();
        setDeleteDialog({ open: false, resource: null });
      } else {
        showAlert('error', result.error || 'Failed to delete resource');
      }
    } catch (error) {
      showAlert('error', 'Failed to delete resource');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateContent = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Add and manage knowledge base resources
          </p>
        </div>

        {/* Alert */}
        {alert.show && (
          <Alert variant={alert.type === 'error' ? 'destructive' : 'default'}>
            {alert.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{alert.message}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Add Resource Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add New Resource
              </CardTitle>
              <CardDescription>
                Paste your content below to add it to the knowledge base
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Paste your knowledge base content here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[300px] resize-none"
                  disabled={isSubmitting}
                />
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>{content.length} characters</span>
                  <span>Ctrl+Enter to submit</span>
                </div>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !content.trim()}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding Resource...
                  </>
                ) : (
                  'Add Resource'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Resources List */}
          <Card>
            <CardHeader>
              <CardTitle>Existing Resources ({resources.length})</CardTitle>
              <CardDescription>
                Manage your knowledge base resources
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading resources...</span>
                </div>
              ) : resources.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No resources found. Add your first resource using the form.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Mobile View */}
                  <div className="md:hidden space-y-3">
                    {resources.map((resource) => (
                      <div key={resource._id} className="border rounded-lg p-3 space-y-2">
                        <div className="text-sm text-muted-foreground">
                          {formatDate(resource._creationTime)}
                        </div>
                        <div className="text-sm">
                          {truncateContent(resource.content, 80)}
                        </div>
                        <Dialog 
                          open={deleteDialog.open && deleteDialog.resource?._id === resource._id}
                          onOpenChange={(open) => 
                            setDeleteDialog({ open, resource: open ? resource : null })
                          }
                        >
                          <DialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="w-full">
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete Resource</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to delete this resource? This action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setDeleteDialog({ open: false, resource: null })}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => handleDelete(resource)}
                              >
                                Delete
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    ))}
                  </div>

                  {/* Desktop View */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Content</TableHead>
                          <TableHead className="w-32">Created</TableHead>
                          <TableHead className="w-20">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resources.map((resource) => (
                          <TableRow key={resource._id}>
                            <TableCell className="font-mono text-sm">
                              {truncateContent(resource.content)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(resource._creationTime)}
                            </TableCell>
                            <TableCell>
                              <Dialog
                                open={deleteDialog.open && deleteDialog.resource?._id === resource._id}
                                onOpenChange={(open) => 
                                  setDeleteDialog({ open, resource: open ? resource : null })
                                }
                              >
                                <DialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Delete Resource</DialogTitle>
                                    <DialogDescription>
                                      Are you sure you want to delete this resource? This action cannot be undone.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter>
                                    <Button
                                      variant="outline"
                                      onClick={() => setDeleteDialog({ open: false, resource: null })}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={() => handleDelete(resource)}
                                    >
                                      Delete
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}