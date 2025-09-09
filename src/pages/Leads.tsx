import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { supabase, Lead } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, Search, Filter, Upload, Phone, Mail, Building, User, MessageSquare, X, Send } from 'lucide-react';

const Leads: React.FC = () => {
  const { profile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newComment, setNewComment] = useState('');
  const [leadComments, setLeadComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    notes: '',
    campaign_id: '',
  });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedCampaignForUpload, setSelectedCampaignForUpload] = useState('');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSelectLead = (leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(lead => lead.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLeads.length === 0) return;

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', selectedLeads);

      if (error) {
        setError(`Error deleting leads: ${error.message}`);
      } else {
        setSuccess(`Successfully deleted ${selectedLeads.length} leads!`);
        setSelectedLeads([]);
        setShowBulkDeleteModal(false);
        fetchLeads();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error: any) {
      setError(`Error deleting leads: ${error.message}`);
    }
  };

  const statusOptions = [
    { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800' },
    { value: 'contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'interested', label: 'Interested', color: 'bg-green-100 text-green-800' },
    { value: 'not_interested', label: 'Not interested', color: 'bg-red-100 text-red-800' },
    { value: 'potential', label: 'Potential', color: 'bg-purple-100 text-purple-800' },
    { value: 'not_attended', label: 'Not attended', color: 'bg-gray-100 text-gray-800' },
    { value: 'busy_call_back', label: 'Busy/Call back', color: 'bg-orange-100 text-orange-800' },
    { value: 'pay_later', label: 'Pay later', color: 'bg-indigo-100 text-indigo-800' },
    { value: 'qualified', label: 'Qualified', color: 'bg-purple-100 text-purple-800' },
    { value: 'proposal', label: 'Proposal', color: 'bg-indigo-100 text-indigo-800' },
    { value: 'negotiation', label: 'Negotiation', color: 'bg-orange-100 text-orange-800' },
    { value: 'closed_won', label: 'Closed Won', color: 'bg-green-100 text-green-800' },
    { value: 'closed_lost', label: 'Closed Lost', color: 'bg-red-100 text-red-800' },
  ];

  useEffect(() => {
    fetchLeads();
    if (profile?.role === 'superadmin') {
      fetchCampaigns();
    }
  }, [profile]);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching campaigns:', error);
      } else {
        setCampaigns(data || []);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const fetchLeads = async () => {
    try {
      let query = supabase.from('leads').select(`
        *,
        campaigns(name)
      `);

      if (profile?.role === 'staff') {
        // Staff can see leads assigned to them OR leads from campaigns they're assigned to
        const { data: assignedCampaigns, error: campaignError } = await supabase
          .from('campaign_assignments')
          .select('campaign_id')
          .eq('staff_id', profile.id);

        if (campaignError) {
          console.error('Error fetching assigned campaigns:', campaignError);
          setLeads([]);
          setLoading(false);
          return;
        }

        const campaignIds = assignedCampaigns?.map(ca => ca.campaign_id) || [];
        
        if (campaignIds.length > 0) {
          // Show leads that are either assigned to the staff member OR from their assigned campaigns
          query = query.or(`assigned_to.eq.${profile.id},campaign_id.in.(${campaignIds.join(',')})`);
        } else {
          // If no campaigns assigned, only show directly assigned leads
          query = query.eq('assigned_to', profile.id);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leads:', error);
      } else {
        setLeads(data || []);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (leadId: string, newStatus: string) => {
    try {
      // Validate inputs
      if (!leadId || !newStatus) {
        console.error('Invalid parameters for status update:', { leadId, newStatus });
        return;
      }

      // Get the current lead data before updating
      const { data: currentLead, error: fetchError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (fetchError) {
        console.error('Error fetching lead data:', fetchError);
        setError('Failed to fetch lead data');
        return;
      }

      const { error } = await supabase
        .from('leads')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) {
        console.error('Error updating lead status:', error.message, error.details);
        setError(`Failed to update lead status: ${error.message}`);
      } else {
        // If status is changed to "closed_won", create a customer record
        if (newStatus === 'closed_won' && currentLead) {
          console.log('Converting lead to customer:', currentLead);
          try {
            const { data: customerData, error: customerError } = await supabase
              .from('customers')
              .insert([{
                lead_id: currentLead.id,
                first_name: currentLead.first_name,
                last_name: currentLead.last_name,
                email: currentLead.email,
                phone: currentLead.phone,
                company: currentLead.company,
                position: currentLead.position,
                notes: currentLead.notes,
                converted_by: profile?.id,
                converted_at: new Date().toISOString(),
              }])
              .select();

            if (customerError) {
              console.error('Error creating customer:', customerError);
              setError('Lead status updated but failed to create customer record');
            } else {
              console.log('Customer created successfully:', customerData);
              setSuccess('Lead converted to customer successfully!');
            }
          } catch (customerCreateError) {
            console.error('Error creating customer:', customerCreateError);
            setError('Lead status updated but failed to create customer record');
          }
        } else {
          setSuccess('Lead status updated successfully!');
        }

        // Also record the status change in history
        if (profile?.id) {
          const { error: historyError } = await supabase.from('lead_status_history').insert([{
            lead_id: leadId,
            new_status: newStatus,
            changed_by: profile.id,
            changed_at: new Date().toISOString()
          }]);
          
          if (historyError) {
            console.error('Error recording status history:', historyError.message);
          }
        }
        
        fetchLeads();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Unexpected error updating lead status:', error);
      setError('An unexpected error occurred while updating the lead status.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      setError('');
    } else {
      setError('Please select a valid CSV file');
      setCsvFile(null);
    }
  };

  const parse