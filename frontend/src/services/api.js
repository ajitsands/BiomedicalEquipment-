// API Service for Biomedical Equipment Management System
// Backend: PHP PDO REST API

const API_BASE = '/api';

export async function fetchDashboardStats() {
  const res = await fetch(`${API_BASE}/dashboard_stats.php`);
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
}

export async function fetchEquipments(filters = {}) {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });
  const url = `${API_BASE}/equipments.php${params.toString() ? '?' + params.toString() : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch equipments');
  return res.json();
}

export async function fetchEquipmentDetail(idOrParam) {
  let url = `${API_BASE}/equipment_detail.php`;
  if (typeof idOrParam === 'number' || !isNaN(idOrParam)) {
    url += `?id=${idOrParam}`;
  } else if (typeof idOrParam === 'string' && idOrParam.startsWith('QR-')) {
    url += `?qr=${encodeURIComponent(idOrParam)}`;
  } else if (typeof idOrParam === 'string') {
    url += `?rfid=${encodeURIComponent(idOrParam)}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch equipment details');
  return res.json();
}

export async function createEquipment(data) {
  const res = await fetch(`${API_BASE}/equipments.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to create equipment');
  return json;
}

export async function updateEquipment(data) {
  const res = await fetch(`${API_BASE}/equipments.php`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to update equipment');
  return json;
}

export async function deleteEquipment(id) {
  const res = await fetch(`${API_BASE}/equipments.php?id=${id}`, {
    method: 'DELETE'
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to delete equipment');
  return json;
}

export async function fetchEquipmentTypes() {
  const res = await fetch(`${API_BASE}/equipment_types.php`);
  if (!res.ok) throw new Error('Failed to fetch equipment types');
  return res.json();
}

export async function fetchChecklistTemplates(all = false, equipmentTypeId = null) {
  let url = `${API_BASE}/checklists.php`;
  if (all) {
    url += `?all_templates=1`;
  } else if (equipmentTypeId) {
    url += `?equipment_type_id=${equipmentTypeId}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch checklists');
  return res.json();
}

export async function submitMaintenanceRecord(data) {
  const res = await fetch(`${API_BASE}/maintenance_records.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to submit maintenance record');
  return json;
}

export async function fetchMaintenanceRecords(equipmentId = null) {
  let url = `${API_BASE}/maintenance_records.php`;
  if (equipmentId) url += `?equipment_id=${equipmentId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch maintenance records');
  return res.json();
}

export async function fetchComplaints(filters = {}) {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key]) params.append(key, filters[key]);
  });
  const url = `${API_BASE}/complaints.php${params.toString() ? '?' + params.toString() : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch complaints');
  return res.json();
}

export async function bookComplaint(data) {
  const res = await fetch(`${API_BASE}/complaints.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to book complaint');
  return json;
}

export async function updateComplaint(data) {
  const res = await fetch(`${API_BASE}/complaints.php`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to update complaint');
  return json;
}

export async function fetchDepartments() {
  const res = await fetch(`${API_BASE}/departments.php`);
  if (!res.ok) throw new Error('Failed to fetch departments');
  return res.json();
}

export async function fetchVendors() {
  const res = await fetch(`${API_BASE}/vendors.php`);
  if (!res.ok) throw new Error('Failed to fetch vendors');
  return res.json();
}

export async function scanRfidTag(data) {
  const res = await fetch(`${API_BASE}/rfid_scan.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to process RFID scan');
  return json;
}

export async function fetchRfidLogs() {
  const res = await fetch(`${API_BASE}/rfid_scan.php`);
  if (!res.ok) throw new Error('Failed to fetch RFID logs');
  return res.json();
}

export async function fetchComplaintCodes() {
  const res = await fetch(`${API_BASE}/complaint_codes.php`);
  if (!res.ok) throw new Error('Failed to fetch complaint codes');
  return res.json();
}

export async function uploadAttachment(formData) {
  const res = await fetch(`${API_BASE}/upload_attachment.php`, {
    method: 'POST',
    body: formData
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to upload attachment');
  return json;
}

export async function fetchSettings() {
  const res = await fetch(`${API_BASE}/settings.php`);
  if (!res.ok) throw new Error('Failed to fetch system settings');
  return res.json();
}

export async function updateSettings(data) {
  const res = await fetch(`${API_BASE}/settings.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to update system settings');
  return json;
}
