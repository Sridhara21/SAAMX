import React, { useState } from 'react';
import { apiFetch } from '../lib/api.js';

export default function RegistrationPage({ state, onNavigateHome }) {
  const currentEvent = (state?.events || []).find(e => e.eventId === state?.currentEventId) || state?.events?.[0] || {
    eventId: 'EVT_LIVE_MAIN',
    eventName: 'SAAMX Annual Inter-School Asset Market Championship',
    eventDate: '2026-10-15',
    venue: 'Grand Convention Exchange Floor',
    registrationOpen: true,
    startingCapital: 10000000,
    teamSize: 4
  };

  const isRegistrationClosed = currentEvent.registrationOpen === false;

  const [step, setStep] = useState(1); // 1: School, 2: House, 3: Members, 4: Review, 5: Confirmation

  // Step 1: School Details
  const [schoolName, setSchoolName] = useState('');
  const [board, setBoard] = useState('CBSE');
  const [city, setCity] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [facultyCoordinator, setFacultyCoordinator] = useState('');

  // Step 2: Investment House Details
  const [investmentHouseName, setInvestmentHouseName] = useState('');
  const [teamType, setTeamType] = useState('Retail');
  const [preferredTeamCode, setPreferredTeamCode] = useState('');
  const [customPassword, setCustomPassword] = useState('');

  // Step 3: Members (2 to 4 students)
  const [members, setMembers] = useState([
    { name: '', role: 'Chief Investment Officer (CIO)', email: '' },
    { name: '', role: 'Head of Quantitative Strategy', email: '' },
    { name: '', role: 'Risk & Derivatives Analyst', email: '' },
    { name: '', role: 'Macro & Sector Specialist', email: '' }
  ]);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmationData, setConfirmationData] = useState(null);

  const handleMemberChange = (index, field, value) => {
    setMembers(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addMemberField = () => {
    if (members.length < 5) {
      setMembers(prev => [...prev, { name: '', role: 'Associate Trader', email: '' }]);
    }
  };

  const removeMemberField = (index) => {
    if (members.length > 2) {
      setMembers(prev => prev.filter((_, i) => i !== index));
    }
  };

  const validateStep1 = () => {
    if (!schoolName.trim()) { setErrorMessage('Please enter school / institution name.'); return false; }
    if (!contactEmail.trim() || !contactEmail.includes('@')) { setErrorMessage('Please provide a valid contact email.'); return false; }
    if (!contactPerson.trim()) { setErrorMessage('Please provide a contact person name.'); return false; }
    setErrorMessage('');
    return true;
  };

  const validateStep2 = () => {
    if (!investmentHouseName.trim()) { setErrorMessage('Please enter Investment House name.'); return false; }
    setErrorMessage('');
    return true;
  };

  const validateStep3 = () => {
    const validMembers = members.filter(m => m.name.trim() !== '');
    if (validMembers.length < 2) {
      setErrorMessage('At least 2 team members are required to form an Investment House.');
      return false;
    }
    setErrorMessage('');
    return true;
  };

  const handleSubmitRegistration = async () => {
    setErrorMessage('');
    setIsSubmitting(true);

    const payload = {
      schoolName: schoolName.trim(),
      board,
      city: city.trim(),
      contactPerson: contactPerson.trim(),
      contactEmail: contactEmail.trim().toLowerCase(),
      contactPhone: contactPhone.trim(),
      facultyCoordinator: facultyCoordinator.trim() || contactPerson.trim(),
      investmentHouseName: investmentHouseName.trim(),
      teamType,
      preferredTeamCode: preferredTeamCode.trim().toUpperCase() || undefined,
      password: customPassword.trim() || undefined,
      members: members.filter(m => m.name.trim() !== '')
    };

    try {
      const res = await apiFetch('/api/register/complete', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setConfirmationData(res);
        setStep(5); // Confirmation Screen
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Registration server communication error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const printBadge = () => {
    window.print();
  };

  return (
    <div className="registration-container" style={{ minHeight: '100vh', backgroundColor: '#0B0E14', color: '#E2E8F0', padding: '32px 16px' }}>
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        
        {/* Header Banner */}
        <div style={{ textAlign: 'center', marginBottom: '32px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '24px' }}>
          <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '4px', background: 'rgba(217, 119, 6, 0.15)', color: '#F59E0B', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '8px' }}>
            SAAMX OFFICIAL REGISTRATION PORTAL
          </div>
          <h1 style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '2.4rem', fontWeight: 800, color: '#F8FAFC', margin: '8px 0' }}>
            Investment House Registration
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '0.95rem', maxWidth: '600px', margin: '0 auto' }}>
            {currentEvent.eventName} • {currentEvent.venue}
          </p>
          <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#64748B' }}>
            Starting Virtual Capital: <strong style={{ color: '#10B981' }}>₹{(currentEvent.startingCapital || 10000000).toLocaleString()}</strong> • Team Size: {currentEvent.teamSize || 4} Members
          </div>
        </div>

        {isRegistrationClosed && step !== 5 && (
          <div style={{ padding: '24px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#FCA5A5', textAlign: 'center', marginBottom: '32px' }}>
            <h3 style={{ margin: '0 0 8px 0' }}>Registration Currently Closed</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>The event administration has locked online registrations for this session. Please contact the SAAMX Exchange Desk in person for on-floor inquiries.</p>
          </div>
        )}

        {/* Multi-Step Wizard Indicator */}
        {step < 5 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '50%', left: '10%', right: '10%', height: '2px', background: 'rgba(255,255,255,0.1)', zIndex: 0 }} />
            {[
              { num: 1, label: 'Institution' },
              { num: 2, label: 'Investment House' },
              { num: 3, label: 'Delegates' },
              { num: 4, label: 'Verification' }
            ].map(s => {
              const isActive = step === s.num;
              const isDone = step > s.num;
              return (
                <div key={s.num} style={{ position: 'relative', zIndex: 1, textAlign: 'center', flex: 1 }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: isActive ? '#D97706' : isDone ? '#10B981' : '#1E293B',
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 8px auto',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    border: '2px solid rgba(255,255,255,0.1)'
                  }}>
                    {isDone ? '✓' : s.num}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isActive ? '#F59E0B' : isDone ? '#10B981' : '#64748B' }}>
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #EF4444', borderRadius: '6px', color: '#FCA5A5', marginBottom: '24px', fontSize: '0.9rem', fontWeight: 600 }}>
            ⚠️ {errorMessage}
          </div>
        )}

        {/* STEP 1: School / Institution Details */}
        {step === 1 && (
          <div style={{ background: '#131822', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '32px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '8px' }}>
              Step 1: Educational Institution Profile
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginBottom: '24px' }}>
              Register the participating school, college, or academic organization. Duplicate registrations for the same institution under this event are prevented.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '6px' }}>School / Institution Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Delhi Public School, R.K. Puram"
                  value={schoolName}
                  onChange={e => setSchoolName(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', background: '#0F131C', border: '1px solid #334155', color: '#FFF' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '6px' }}>Board / Curriculum</label>
                <select
                  value={board}
                  onChange={e => setBoard(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', background: '#0F131C', border: '1px solid #334155', color: '#FFF' }}
                >
                  <option value="CBSE">CBSE</option>
                  <option value="ICSE / ISC">ICSE / ISC</option>
                  <option value="IB (International Baccalaureate)">IB (International Baccalaureate)</option>
                  <option value="Cambridge (IGCSE / A-Levels)">Cambridge (IGCSE / A-Levels)</option>
                  <option value="State Board">State Board</option>
                  <option value="Undergraduate University">Undergraduate University</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '6px' }}>City</label>
                <input
                  type="text"
                  placeholder="e.g. New Delhi"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', background: '#0F131C', border: '1px solid #334155', color: '#FFF' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '6px' }}>Contact Person / Student Lead *</label>
                <input
                  type="text"
                  placeholder="e.g. Aarav Sharma"
                  value={contactPerson}
                  onChange={e => setContactPerson(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', background: '#0F131C', border: '1px solid #334155', color: '#FFF' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '6px' }}>Contact Email *</label>
                <input
                  type="email"
                  placeholder="e.g. contact@dpsrkp.edu"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', background: '#0F131C', border: '1px solid #334155', color: '#FFF' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '6px' }}>Contact Phone / Mobile</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', background: '#0F131C', border: '1px solid #334155', color: '#FFF' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '6px' }}>Faculty Coordinator / Teacher In-Charge</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. R. K. Joshi"
                  value={facultyCoordinator}
                  onChange={e => setFacultyCoordinator(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', background: '#0F131C', border: '1px solid #334155', color: '#FFF' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => { if (validateStep1()) setStep(2); }}
                style={{ padding: '12px 28px', background: '#D97706', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
              >
                Next: Investment House Details →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Investment House Details */}
        {step === 2 && (
          <div style={{ background: '#131822', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '32px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '8px' }}>
              Step 2: Investment House Identity
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginBottom: '24px' }}>
              Define the institutional fund entity that will represent your delegation on the live market trading floor.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '6px' }}>Investment House Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Sovereign Asset Management"
                  value={investmentHouseName}
                  onChange={e => setInvestmentHouseName(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', background: '#0F131C', border: '1px solid #334155', color: '#FFF' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '6px' }}>Institutional Fund Type</label>
                <select
                  value={teamType}
                  onChange={e => setTeamType(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', background: '#0F131C', border: '1px solid #334155', color: '#FFF' }}
                >
                  <option value="Retail">Retail Investor Desk</option>
                  <option value="Mutual Fund">Institutional Mutual Fund</option>
                  <option value="Hedge Fund">Quantitative Hedge Fund</option>
                  <option value="Prop Desk">Proprietary Trading Desk</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '6px' }}>Preferred Team Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. APEX01 or leave blank for auto-allocation"
                  value={preferredTeamCode}
                  onChange={e => setPreferredTeamCode(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', background: '#0F131C', border: '1px solid #334155', color: '#FFF' }}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>If unassigned, the exchange assigns IH01, IH02, etc.</span>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '6px' }}>Custom Access Password (Optional)</label>
                <input
                  type="password"
                  placeholder="Leave blank to automatically receive a secure 6-digit access PIN"
                  value={customPassword}
                  onChange={e => setCustomPassword(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', background: '#0F131C', border: '1px solid #334155', color: '#FFF' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{ padding: '12px 24px', background: 'transparent', color: '#94A3B8', border: '1px solid #334155', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => { if (validateStep2()) setStep(3); }}
                style={{ padding: '12px 28px', background: '#D97706', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
              >
                Next: Delegate Members →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Delegate Members */}
        {step === 3 && (
          <div style={{ background: '#131822', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#F8FAFC', margin: '0 0 4px 0' }}>
                  Step 3: Team Delegates & Officers
                </h2>
                <p style={{ color: '#94A3B8', fontSize: '0.85rem', margin: 0 }}>
                  Enter student delegate details (min 2, max 5).
                </p>
              </div>
              {members.length < 5 && (
                <button
                  type="button"
                  onClick={addMemberField}
                  style={{ padding: '8px 14px', background: '#1E293B', color: '#38BDF8', border: '1px solid #38BDF8', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  + Add Member
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
              {members.map((member, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 2fr auto', gap: '12px', alignItems: 'center', background: '#0F131C', padding: '16px', borderRadius: '8px', border: '1px solid #1E293B' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748B', marginBottom: '4px' }}>Member {idx + 1} Name *</label>
                    <input
                      type="text"
                      placeholder={`Full Name`}
                      value={member.name}
                      onChange={e => handleMemberChange(idx, 'name', e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '4px', background: '#131822', border: '1px solid #334155', color: '#FFF', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748B', marginBottom: '4px' }}>Role / Designation</label>
                    <input
                      type="text"
                      placeholder="e.g. CIO / Portfolio Analyst"
                      value={member.role}
                      onChange={e => handleMemberChange(idx, 'role', e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '4px', background: '#131822', border: '1px solid #334155', color: '#FFF', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748B', marginBottom: '4px' }}>Email (Optional)</label>
                    <input
                      type="email"
                      placeholder="student@school.edu"
                      value={member.email}
                      onChange={e => handleMemberChange(idx, 'email', e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '4px', background: '#131822', border: '1px solid #334155', color: '#FFF', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div style={{ paddingTop: '18px' }}>
                    {members.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeMemberField(idx)}
                        style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '1.1rem' }}
                        title="Remove member"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                style={{ padding: '12px 24px', background: 'transparent', color: '#94A3B8', border: '1px solid #334155', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => { if (validateStep3()) setStep(4); }}
                style={{ padding: '12px 28px', background: '#D97706', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
              >
                Next: Review & Verify →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Summary & Submission */}
        {step === 4 && (
          <div style={{ background: '#131822', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '32px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '8px' }}>
              Step 4: Review Registration Details
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginBottom: '24px' }}>
              Please carefully review your submission before sending it to the SAAMX Exchange Desk for verification.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', background: '#0F131C', padding: '24px', borderRadius: '8px', border: '1px solid #1E293B', marginBottom: '24px' }}>
              <div>
                <h4 style={{ color: '#F59E0B', margin: '0 0 12px 0', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>School / Institution</h4>
                <div style={{ fontSize: '0.9rem', marginBottom: '4px' }}><strong>{schoolName}</strong></div>
                <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Curriculum: {board} • City: {city || 'N/A'}</div>
                <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Contact: {contactPerson} ({contactEmail})</div>
                {contactPhone && <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Phone: {contactPhone}</div>}
              </div>

              <div>
                <h4 style={{ color: '#F59E0B', margin: '0 0 12px 0', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Investment House</h4>
                <div style={{ fontSize: '0.9rem', marginBottom: '4px' }}><strong>{investmentHouseName}</strong></div>
                <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Fund Strategy: {teamType}</div>
                <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Requested Code: {preferredTeamCode || 'Auto-allocated (IH01..)'}</div>
                <div style={{ fontSize: '0.85rem', color: '#10B981' }}>Starting Capital: ₹{(currentEvent.startingCapital || 10000000).toLocaleString()}</div>
              </div>

              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                <h4 style={{ color: '#F59E0B', margin: '0 0 12px 0', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delegates ({members.filter(m => m.name.trim() !== '').length})</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                  {members.filter(m => m.name.trim() !== '').map((m, i) => (
                    <div key={i} style={{ background: '#131822', padding: '10px', borderRadius: '6px', border: '1px solid #334155' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{m.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{m.role}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => setStep(3)}
                style={{ padding: '12px 24px', background: 'transparent', color: '#94A3B8', border: '1px solid #334155', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                ← Edit Details
              </button>
              <button
                type="button"
                disabled={isSubmitting || isRegistrationClosed}
                onClick={handleSubmitRegistration}
                style={{ padding: '12px 36px', background: isSubmitting ? '#92400E' : '#10B981', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', fontSize: '0.95rem' }}
              >
                {isSubmitting ? 'Submitting Registration...' : '✓ Confirm & Register House'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Official Confirmation Ticket */}
        {step === 5 && confirmationData && (
          <div style={{ background: '#131822', border: '2px solid #10B981', borderRadius: '12px', padding: '36px', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', fontSize: '1.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              ✓
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#F8FAFC', margin: '0 0 8px 0' }}>
              Registration Successfully Submitted!
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '0.95rem', maxWidth: '520px', margin: '0 auto 28px auto' }}>
              Your Investment House has been registered in the SAAMX exchange database. Please present this credential slip at the floor verification desk.
            </p>

            {/* Credential Slip Card */}
            <div id="saamx-credential-badge" style={{ background: '#0F131C', border: '1px dashed #38BDF8', borderRadius: '10px', padding: '24px', textAlign: 'left', maxWidth: '540px', margin: '0 auto 28px auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#38BDF8', fontWeight: 700, letterSpacing: '0.1em' }}>SAAMX OFFICIAL DELEGATE PASS</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFF' }}>{confirmationData.investmentHouse?.investmentHouseName}</div>
                  <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>{confirmationData.school?.schoolName}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>ASSIGNED CODE</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#F59E0B', fontFamily: 'monospace' }}>{confirmationData.teamCode}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>CONSOLE USERNAME</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#FFF', fontFamily: 'monospace' }}>{confirmationData.teamCode}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>TEMPORARY PIN / PASSWORD</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10B981', fontFamily: 'monospace' }}>{confirmationData.tempPin}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>REGISTRATION REF</div>
                  <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontFamily: 'monospace' }}>{confirmationData.registrationId}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>STATUS</div>
                  <div style={{ fontSize: '0.85rem', color: '#F59E0B', fontWeight: 700 }}>PENDING DESK VERIFICATION</div>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#64748B', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                Present this code to the Exchange Administrator to activate your virtual ₹10,000,000 portfolio before the opening bell.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button
                type="button"
                onClick={printBadge}
                style={{ padding: '12px 24px', background: '#38BDF8', color: '#0F172A', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
              >
                🖨️ Print Credential Slip
              </button>
              <button
                type="button"
                onClick={() => { window.location.hash = '#/'; }}
                style={{ padding: '12px 24px', background: '#1E293B', color: '#FFF', border: '1px solid #334155', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                Return to Floor Gateway →
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
