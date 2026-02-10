
import React, { useState, useRef } from 'react';
import { Contact } from '../types';
import { 
  Users, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Mail, 
  User as UserIcon,
  Search,
  Download,
  Upload,
  Tag as TagIcon,
  Filter,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  Pencil,
  X
} from 'lucide-react';

interface ContactsPageProps {
  contacts: Contact[];
  onAddContact: (email: string, name: string, tag: string) => Promise<void>;
  onUpdateContact: (id: string, email: string, name: string, tag: string) => Promise<void>;
  onImportContacts: (contacts: Omit<Contact, 'id' | 'createdAt'>[]) => Promise<void>;
  onDeleteContact: (id: string) => Promise<void>;
  onBack: () => void;
}

const ContactsPage: React.FC<ContactsPageProps> = ({ 
  contacts, 
  onAddContact, 
  onUpdateContact,
  onImportContacts,
  onDeleteContact, 
  onBack 
}) => {
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newTag, setNewTag] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState('All');
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit State
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTag, setEditTag] = useState('');

  const startEditing = (contact: Contact) => {
    setEditingContact(contact);
    setEditName(contact.name || '');
    setEditEmail(contact.email);
    setEditTag(contact.tag || '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact || !editEmail) return;
    
    setLoading(true);
    try {
      await onUpdateContact(editingContact.id, editEmail, editName, editTag);
      setEditingContact(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    setLoading(true);
    try {
      await onAddContact(newEmail, newName, newTag);
      setNewEmail('');
      setNewName('');
      setNewTag('');
      setIsAdding(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = "Name,Email,Tag\nJohn Doe,john@example.com,VIP\nJane Smith,jane@example.com,Newsletter";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'contacts_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (contacts.length === 0) return;
    
    const headers = ['Name', 'Email', 'Tag', 'Created At'];
    const rows = contacts.map(c => [
      c.name || '',
      c.email,
      c.tag || '',
      new Date(c.createdAt).toISOString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `updateer_contacts_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/);
      const imported: Omit<Contact, 'id' | 'createdAt'>[] = [];

      // Start from index 1 to skip header
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Robust CSV parsing for comma-separated values with optional quotes
        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/^"|"$/g, ''));
        
        if (parts.length >= 2) {
          imported.push({
            name: parts[0] || '',
            email: parts[1] || '',
            tag: parts[2] || '' // Third column is Tag
          });
        }
      }

      if (imported.length > 0) {
        setLoading(true);
        try {
          await onImportContacts(imported);
          alert(`Successfully imported ${imported.length} contacts with tags.`);
        } catch (err) {
          alert('Failed to import contacts. Please check your CSV format.');
        } finally {
          setLoading(false);
        }
      } else {
        alert('No valid contacts found in the CSV file. Ensure the format is: Name, Email, Tag');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const tags = ['All', ...Array.from(new Set(contacts.map(c => c.tag).filter(Boolean)))];

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (c.tag || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = tagFilter === 'All' || c.tag === tagFilter;
    return matchesSearch && matchesTag;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Editor
          </button>
          
          <div className="flex gap-3">
            <button 
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-sm font-medium transition-all border border-slate-800"
              title="Download CSV Template"
            >
              <FileText className="w-4 h-4" />
              Template
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportCSV} 
              accept=".csv" 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-all border border-slate-700"
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </button>
            <button 
              onClick={handleExportCSV}
              disabled={contacts.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-all border border-slate-700 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-900/20"
            >
              <Plus className="w-4 h-4" />
              Add Contact
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Contacts Management</h1>
            <p className="text-slate-400">Organize your mailing list with custom tags for targeted bulk messaging.</p>
          </div>
        </div>

        <div className="mb-8 bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-blue-200 font-medium text-sm">Pro Tip: Check for Typos</h3>
            <p className="text-blue-300/80 text-sm mt-1">
              Always double-check your contacts for typos. Invalid email addresses will bounce but still consume your sending credits.
            </p>
          </div>
        </div>

        {isAdding && (
          <div className="mb-8 bg-slate-900 border border-blue-500/30 rounded-2xl p-6 animate-in fade-in slide-in-from-top-4 shadow-xl">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-400" />
              Add New Contact
            </h2>
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="Email Address"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div className="relative">
                <TagIcon className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Tag (e.g. VIP, Fall 2024)"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Contact'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {editingContact && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-blue-400" />
                  Edit Contact
                </h2>
                <button 
                  onClick={() => setEditingContact(null)}
                  className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-400 ml-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-400 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      placeholder="Email Address"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-400 ml-1">Tag</label>
                  <div className="relative">
                    <TagIcon className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Tag (e.g. VIP)"
                      value={editTag}
                      onChange={(e) => setEditTag(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingContact(null)}
                    className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Update Contact'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/50">
            <div className="flex flex-1 gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by name, email or tag..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-8 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none min-w-[140px]"
                >
                  {tags.map(t => (
                    <option key={t} value={t}>{t === 'All' ? 'All Tags' : t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="text-sm text-slate-500 font-medium">
              {filteredContacts.length} contacts found
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tag</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Added On</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredContacts.length > 0 ? (
                  filteredContacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-xs border border-blue-500/20">
                            {contact.name ? contact.name.charAt(0) : contact.email.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-200">{contact.name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-mono text-sm">{contact.email}</td>
                      <td className="px-6 py-4">
                        {contact.tag ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-400 border border-blue-500/20">
                            <TagIcon className="w-3 h-3" />
                            {contact.tag}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs italic">No tag</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {new Date(contact.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEditing(contact)}
                            className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                            title="Edit Contact"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteContact(contact.id)}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                            title="Delete Contact"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-4 text-slate-500">
                        <div className="p-4 bg-slate-800/50 rounded-full">
                          <FileSpreadsheet className="w-12 h-12 opacity-20" />
                        </div>
                        <div className="max-w-xs mx-auto">
                          <p className="text-lg font-medium text-slate-400">No contacts found</p>
                          <p className="text-sm mt-1">Try adjusting your search or filter, or import a CSV file to get started.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {contacts.length > 0 && filteredContacts.length === 0 && (
            <div className="p-4 bg-blue-900/10 border-t border-slate-800 flex items-center gap-3 text-blue-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>You have {contacts.length} total contacts, but none match the current filter.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactsPage;
