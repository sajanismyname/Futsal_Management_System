import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCourt, createCourt, updateCourt } from '../../services/courtService';
import { PageSpinner } from '../../components/ui/Spinner';
import Spinner from '../../components/ui/Spinner';
import { getErrorMessage } from '../../utils/helpers';
import toast from 'react-hot-toast';

const CourtFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    courtName: '', location: '', address: '', price: '',
    courtType: '5A', description: '',
    operatingHours: JSON.stringify({ open: '06:00', close: '22:00' }),
    amenities: JSON.stringify([]),
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [amenityInput, setAmenityInput] = useState('');
  const [amenities, setAmenities] = useState([]);
  const [hours, setHours] = useState({ open: '06:00', close: '22:00' });

  useEffect(() => {
    if (isEdit) {
      getCourt(id).then((r) => {
        const c = r.data.court;
        setForm({ courtName: c.courtName, location: c.location, address: c.address || '', price: c.price, courtType: c.courtType, description: c.description || '', operatingHours: JSON.stringify(c.operatingHours), amenities: JSON.stringify(c.amenities || []) });
        setHours(c.operatingHours);
        setAmenities(c.amenities || []);
      }).catch(() => toast.error('Failed to load court')).finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const addAmenity = () => {
    if (!amenityInput.trim()) return;
    const updated = [...amenities, amenityInput.trim()];
    setAmenities(updated); setForm({ ...form, amenities: JSON.stringify(updated) }); setAmenityInput('');
  };
  const removeAmenity = (i) => {
    const updated = amenities.filter((_, idx) => idx !== i);
    setAmenities(updated); setForm({ ...form, amenities: JSON.stringify(updated) });
  };
  const handleHoursChange = (field, val) => {
    const updated = { ...hours, [field]: val };
    setHours(updated); setForm({ ...form, operatingHours: JSON.stringify(updated) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      imageFiles.forEach((f) => formData.append('images', f));
      if (isEdit) { await updateCourt(id, formData); toast.success('Court updated'); }
      else { await createCourt(formData); toast.success('Court submitted for approval!'); }
      navigate('/owner/courts');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  if (loading) return <PageSpinner />;

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-ink-deep" style={{ letterSpacing: '-0.5px' }}>
          {isEdit ? 'Edit court' : 'Add new court'}
        </h1>
        <p className="text-sm text-slate mt-1">{isEdit ? 'Update your court details' : 'Fill in the details to list your court'}</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">

        <div className="card p-6 space-y-5">
          <h2 className="text-sm font-semibold text-ink-deep">Court details</h2>
          <div className="input-group">
            <label className="input-label">Court name *</label>
            <input type="text" name="courtName" value={form.courtName} onChange={handleChange} className="input" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="input-group">
              <label className="input-label">Location / Area *</label>
              <input type="text" name="location" value={form.location} onChange={handleChange} className="input" placeholder="e.g. Kathmandu" required />
            </div>
            <div className="input-group">
              <label className="input-label">Full address</label>
              <input type="text" name="address" value={form.address} onChange={handleChange} className="input" placeholder="Street, ward..." />
            </div>
            <div className="input-group">
              <label className="input-label">Price (NPR/hr) *</label>
              <input type="number" name="price" value={form.price} onChange={handleChange} className="input" min="0" required />
            </div>
            <div className="input-group">
              <label className="input-label">Court type *</label>
              <select name="courtType" value={form.courtType} onChange={handleChange} className="input">
                <option value="5A">5A Side</option>
                <option value="7A">7A Side</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Opens at</label>
              <input type="time" value={hours.open} onChange={(e) => handleHoursChange('open', e.target.value)} className="input" />
            </div>
            <div className="input-group">
              <label className="input-label">Closes at</label>
              <input type="time" value={hours.close} onChange={(e) => handleHoursChange('close', e.target.value)} className="input" />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} className="input h-24 resize-none" placeholder="Describe your court..." />
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-sm font-semibold text-ink-deep mb-4">Amenities</h2>
          <div className="flex gap-2 mb-3">
            <input type="text" className="input flex-1" placeholder="e.g. Parking, Showers..." value={amenityInput} onChange={(e) => setAmenityInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity())} />
            <button type="button" onClick={addAmenity} className="btn-secondary flex-shrink-0">Add</button>
          </div>
          {amenities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {amenities.map((a, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 text-sm bg-gray-50 border border-hairline rounded-md px-3 py-1.5 text-ink">
                  {a}
                  <button type="button" onClick={() => removeAmenity(i)} className="text-steel hover:text-error transition-colors">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-sm font-semibold text-ink-deep mb-4">Court images (up to 5)</h2>
          <input type="file" multiple accept="image/*" className="input" onChange={(e) => setImageFiles(Array.from(e.target.files).slice(0, 5))} />
          {imageFiles.length > 0 && <p className="text-xs text-slate mt-2">{imageFiles.length} file(s) selected</p>}
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? <Spinner size="sm" /> : isEdit ? 'Save changes' : 'Submit for approval'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CourtFormPage;
