import React, { useState } from 'react';
import { apiFetch } from '../lib/api.js';
import ThemeToggle from '../components/ThemeToggle.jsx';
import { Card, CardHeader, CardTitle, CardBody, Badge, Button, Input, Select, Alert } from '../components/ui/index.js';
import {
  IconBuilding,
  IconBriefcase,
  IconUser,
  IconShieldCheck,
  IconShieldAlert,
  IconChevronLeft,
  IconArrowRight,
  IconCheck,
  IconPrinter,
  IconX,
  IconClipboardList,
  IconLock
} from '../lib/icons.jsx';

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

  const configuredCapacity = Math.min(20, Math.max(10, Number(currentEvent.maximumInvestmentHouses || state?.settings?.configuredHouseCapacity || 20)));
  const registeredCount = (state?.investmentHouses || []).length;
  const activeTeamsCount = (state?.teams || []).filter(t => t.isActive).length;
  const isCapacityReached = registeredCount >= configuredCapacity;
  const isRegistrationClosed = currentEvent.registrationOpen === false || isCapacityReached;

  const [step, setStep] = useState(1); // 1: School, 2: House, 3: Members, 4: Review, 5: Confirmation

  // Step 1: School Details (including contactEmail and contactPhone)
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

  // Step 3: Members (2 to 5 students)
  const [members, setMembers] = useState([
    { name: '', role: 'Chief Investment Officer (CIO)' },
    { name: '', role: 'Head of Quantitative Strategy' },
    { name: '', role: 'Risk & Derivatives Analyst' },
    { name: '', role: 'Macro & Sector Specialist' }
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
      setMembers(prev => [...prev, { name: '', role: 'Associate Trader' }]);
    }
  };

  const removeMemberField = (index) => {
    if (members.length > 2) {
      setMembers(prev => prev.filter((_, i) => i !== index));
    }
  };

  const validateStep1 = () => {
    if (!schoolName.trim()) {
      setErrorMessage('Please enter the school or institution name.');
      return false;
    }
    if (!contactPerson.trim() && !facultyCoordinator.trim()) {
      setErrorMessage('Please provide a student team leader or faculty coordinator name.');
      return false;
    }
    setErrorMessage('');
    return true;
  };

  const validateStep2 = () => {
    if (!investmentHouseName.trim()) {
      setErrorMessage('Please enter the Investment House name.');
      return false;
    }
    setErrorMessage('');
    return true;
  };

  const validateStep3 = () => {
    const validMembers = members.filter(m => m.name.trim() !== '');
    if (validMembers.length < 2) {
      setErrorMessage('At least 2 student delegate members are required to form an Investment House.');
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
      contactPerson: contactPerson.trim() || facultyCoordinator.trim(),
      contactEmail: contactEmail.trim(),
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

      let data = null;
      if (res && typeof res.json === 'function') {
        data = await res.json();
      } else {
        data = res;
      }

      if (!res.ok || data?.error) {
        setErrorMessage(data?.error || `Registration submission failed (${res.status || 'Error'}). Please verify details and retry.`);
      } else {
        setConfirmationData(data);
        setStep(5); // Confirmation Screen
      }
    } catch (err) {
      console.error('Registration submission error:', err);
      setErrorMessage('Registration server communication error. Please check network connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToHome = () => {
    if (typeof onNavigateHome === 'function') {
      onNavigateHome();
    } else {
      window.location.hash = '#/';
    }
  };

  const printBadge = () => {
    window.print();
  };

  const boardOptions = [
    { value: 'CBSE', label: 'CBSE (Central Board of Secondary Education)' },
    { value: 'ICSE / ISC', label: 'ICSE / ISC (Council for the Indian School Certificate Examinations)' },
    { value: 'IB (International Baccalaureate)', label: 'IB (International Baccalaureate Diploma)' },
    { value: 'Cambridge (IGCSE / A-Levels)', label: 'Cambridge International (IGCSE / A-Levels)' },
    { value: 'State Board', label: 'State Examination Board' },
    { value: 'Undergraduate University', label: 'Undergraduate University / Collegiate Institute' }
  ];

  const fundTypeOptions = [
    { value: 'Retail', label: 'Retail Investor Desk (Diversified Portfolio)' },
    { value: 'Mutual Fund', label: 'Institutional Mutual Fund (Long-Term Value)' },
    { value: 'Hedge Fund', label: 'Quantitative Hedge Fund (High-Frequency & Arbitrage)' },
    { value: 'Prop Desk', label: 'Proprietary Trading Desk (Macro Thematic)' }
  ];

  const wizardSteps = [
    { num: 1, label: 'Institution', icon: <IconBuilding size={16} /> },
    { num: 2, label: 'Investment House', icon: <IconBriefcase size={16} /> },
    { num: 3, label: 'Delegates', icon: <IconUser size={16} /> },
    { num: 4, label: 'Verification', icon: <IconClipboardList size={16} /> }
  ];

  return (
    <div
      className="saamx-registration-page"
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg, #0B0E14)',
        color: 'var(--color-text-primary, #F8FAFC)',
        padding: '32px 16px 64px 16px',
        fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)'
      }}
    >
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>

        {/* Top Utility Bar */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '28px',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--color-border-subtle, rgba(255,255,255,0.08))'
          }}
        >
          <button
            type="button"
            onClick={handleBackToHome}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md, 6px)',
              background: 'transparent',
              color: 'var(--color-text-secondary, #94A3B8)',
              border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <IconChevronLeft size={16} />
            <span>Floor Gateway</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--color-accent-amber, #D97706)',
                background: 'var(--color-accent-amber-subtle, rgba(217, 119, 6, 0.12))',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm, 4px)',
                border: '1px solid rgba(217, 119, 6, 0.25)'
              }}
            >
              <IconShieldCheck size={14} />
              Official Registration Portal
            </span>
            <ThemeToggle />
          </div>
        </header>

        {/* Page Header Banner */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1
            style={{
              fontFamily: 'var(--font-display, sans-serif)',
              fontSize: '2.25rem',
              fontWeight: 800,
              color: 'var(--color-text-primary, #F8FAFC)',
              margin: '0 0 10px 0',
              letterSpacing: '-0.02em'
            }}
          >
            Investment House Registration
          </h1>
          <p
            style={{
              color: 'var(--color-text-secondary, #94A3B8)',
              fontSize: '0.95rem',
              maxWidth: '620px',
              margin: '0 auto 18px auto',
              lineHeight: 1.5
            }}
          >
            {currentEvent.eventName} • {currentEvent.venue}
          </p>

          {/* Institutional Metric Bar */}
          <div
            style={{
              display: 'inline-flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '16px',
              padding: '10px 20px',
              borderRadius: 'var(--radius-md, 8px)',
              background: 'var(--color-surface, #131822)',
              border: '1px solid var(--color-border-subtle, rgba(255,255,255,0.08))',
              fontSize: '0.85rem',
              color: 'var(--color-text-secondary, #94A3B8)'
            }}
          >
            <div>
              Starting Capital:{' '}
              <strong
                className="tabular-nums"
                style={{ color: 'var(--color-rise, #10B981)', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}
              >
                ₹{(currentEvent.startingCapital || 10000000).toLocaleString('en-IN')}
              </strong>
            </div>
            <span style={{ opacity: 0.3 }}>•</span>
            <div>
              Delegation Format: <strong style={{ color: 'var(--color-text-primary, #F8FAFC)' }}>2 to 5 Members</strong>
            </div>
            <span style={{ opacity: 0.3 }}>•</span>
            <div>
              Configured Capacity:{' '}
              <strong style={{ color: 'var(--color-primary, #2563EB)' }}>{configuredCapacity} Houses</strong>{' '}
              <span className="tabular-nums" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted, #64748B)' }}>
                ({registeredCount}/{configuredCapacity} Registered Intake)
              </span>
            </div>
          </div>
        </div>

        {/* Capacity / Registration Closed Warning Banner */}
        {isRegistrationClosed && step !== 5 && (
          <div style={{ marginBottom: '24px' }}>
            <Alert
              variant={isCapacityReached ? 'warning' : 'danger'}
              title={isCapacityReached ? 'Event Capacity Limit Reached' : 'Online Registration Suspended'}
            >
              {isCapacityReached
                ? `The maximum participating intake of ${configuredCapacity} Investment Houses has been reached for this championship. Additional applications will be reviewed on a standby basis. Please contact the SAAMX Exchange Desk for floor delegation inquiries.`
                : 'Online registration intake has been closed by the event secretariat. Please report directly to the SAAMX Exchange Desk for on-site registration verification.'}
            </Alert>
          </div>
        )}

        {/* Multi-Step Wizard Indicator */}
        {step < 5 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '32px',
              position: 'relative',
              padding: '0 8px'
            }}
          >
            {/* Background connecting track */}
            <div
              style={{
                position: 'absolute',
                top: '20px',
                left: '40px',
                right: '40px',
                height: '2px',
                background: 'var(--color-border, rgba(255,255,255,0.1))',
                zIndex: 0
              }}
            />

            {wizardSteps.map(s => {
              const isActive = step === s.num;
              const isDone = step > s.num;
              return (
                <div
                  key={s.num}
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    textAlign: 'center',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: isActive
                        ? 'var(--color-primary, #2563EB)'
                        : isDone
                        ? 'var(--color-rise, #10B981)'
                        : 'var(--color-surface, #131822)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '8px',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      border: isActive
                        ? '2px solid var(--color-primary-hover, #3B82F6)'
                        : isDone
                        ? '2px solid var(--color-rise, #10B981)'
                        : '2px solid var(--color-border, rgba(255,255,255,0.12))',
                      boxShadow: isActive ? '0 0 12px rgba(37, 99, 235, 0.4)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isDone ? <IconCheck size={18} strokeWidth={2.5} /> : s.num}
                  </div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: isActive ? 700 : 600,
                      color: isActive
                        ? 'var(--color-primary, #2563EB)'
                        : isDone
                        ? 'var(--color-rise, #10B981)'
                        : 'var(--color-text-muted, #64748B)',
                      transition: 'color 0.2s ease'
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <div style={{ marginBottom: '24px' }}>
            <Alert variant="danger" title="Validation Alert">
              {errorMessage}
            </Alert>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 1: Educational Institution Profile                      */}
        {/* ============================================================ */}
        {step === 1 && (
          <Card
            style={{
              background: 'var(--color-surface, #131822)',
              border: '1px solid var(--color-border-subtle, rgba(255,255,255,0.08))',
              borderRadius: 'var(--radius-lg, 12px)',
              padding: '32px'
            }}
          >
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--color-primary, #2563EB)' }}>
                  <IconBuilding size={20} />
                </span>
                <h2
                  style={{
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    color: 'var(--color-text-primary, #F8FAFC)',
                    margin: 0
                  }}
                >
                  Step 1: Educational Institution Profile
                </h2>
              </div>
              <p style={{ color: 'var(--color-text-secondary, #94A3B8)', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
                Register the participating school, college, or academic organization. Each educational institution is assigned a single floor delegation per competition session.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Input
                  id="registration-school-name"
                  name="schoolName"
                  label="School / Institution Name"
                  required
                  placeholder="e.g. Delhi Public School, R.K. Puram"
                  value={schoolName}
                  onChange={e => setSchoolName(e.target.value)}
                />
              </div>

              <div>
                <Select
                  id="registration-board"
                  name="board"
                  label="Board / Curriculum"
                  options={boardOptions}
                  value={board}
                  onChange={e => setBoard(e.target.value)}
                />
              </div>

              <div>
                <Input
                  id="registration-city"
                  name="city"
                  label="City / Region"
                  placeholder="e.g. New Delhi"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                />
              </div>

              <div>
                <Input
                  id="registration-contact-person"
                  name="contactPerson"
                  label="Student Team Leader"
                  required
                  placeholder="e.g. Aarav Sharma"
                  value={contactPerson}
                  onChange={e => setContactPerson(e.target.value)}
                />
              </div>

              <div>
                <Input
                  id="registration-contact-email"
                  name="contactEmail"
                  label="Team Leader Email Address"
                  type="email"
                  placeholder="e.g. aarav.sharma@school.edu"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  helperText="Official credentials and desk allocations will be sent here."
                />
              </div>

              <div>
                <Input
                  id="registration-contact-phone"
                  name="contactPhone"
                  label="Contact Phone / Mobile"
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  helperText="For on-floor dispatch and exchange desk urgent notifications."
                />
              </div>

              <div>
                <Input
                  id="registration-faculty-coordinator"
                  name="facultyCoordinator"
                  label="Faculty Coordinator / Teacher In-Charge"
                  placeholder="e.g. Dr. R. K. Joshi"
                  value={facultyCoordinator}
                  onChange={e => setFacultyCoordinator(e.target.value)}
                  helperText="Faculty supervisor accompanying the delegation."
                />
              </div>
            </div>

            <div
              style={{
                marginTop: '32px',
                paddingTop: '20px',
                borderTop: '1px solid var(--color-border-subtle, rgba(255,255,255,0.08))',
                display: 'flex',
                justifyContent: 'flex-end'
              }}
            >
              <Button
                variant="primary"
                onClick={() => {
                  if (validateStep1()) setStep(2);
                }}
                disabled={isRegistrationClosed}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
              >
                <span>Next: Investment House Details</span>
                <IconArrowRight size={16} />
              </Button>
            </div>
          </Card>
        )}

        {/* ============================================================ */}
        {/* STEP 2: Investment House Details                             */}
        {/* ============================================================ */}
        {step === 2 && (
          <Card
            style={{
              background: 'var(--color-surface, #131822)',
              border: '1px solid var(--color-border-subtle, rgba(255,255,255,0.08))',
              borderRadius: 'var(--radius-lg, 12px)',
              padding: '32px'
            }}
          >
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--color-primary, #2563EB)' }}>
                  <IconBriefcase size={20} />
                </span>
                <h2
                  style={{
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    color: 'var(--color-text-primary, #F8FAFC)',
                    margin: 0
                  }}
                >
                  Step 2: Investment House Identity
                </h2>
              </div>
              <p style={{ color: 'var(--color-text-secondary, #94A3B8)', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
                Define the institutional fund identity that will represent your delegation across the physical exchange floor and order matching engine.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Input
                  id="registration-house-name"
                  name="investmentHouseName"
                  label="Investment House Name"
                  required
                  placeholder="e.g. Apex Sovereign Asset Management"
                  value={investmentHouseName}
                  onChange={e => setInvestmentHouseName(e.target.value)}
                />
              </div>

              <div>
                <Select
                  id="registration-team-type"
                  name="teamType"
                  label="Institutional Fund Type"
                  options={fundTypeOptions}
                  value={teamType}
                  onChange={e => setTeamType(e.target.value)}
                />
              </div>

              <div>
                <Input
                  id="registration-preferred-team-code"
                  name="preferredTeamCode"
                  label="Preferred House Code (Optional)"
                  placeholder="e.g. APEX01 (or leave blank for auto-allocation)"
                  value={preferredTeamCode}
                  onChange={e => setPreferredTeamCode(e.target.value.toUpperCase())}
                  helperText="If unassigned, the exchange assigns IH01, IH02, etc."
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <Input
                  id="registration-custom-password"
                  name="customPassword"
                  label="Custom Access Password (Optional)"
                  type="password"
                  placeholder="Leave blank to automatically receive a secure 6-digit access PIN"
                  value={customPassword}
                  onChange={e => setCustomPassword(e.target.value)}
                  helperText="If left empty, an authoritative 6-digit floor PIN will be securely generated upon confirmation."
                />
              </div>
            </div>

            <div
              style={{
                marginTop: '32px',
                paddingTop: '20px',
                borderTop: '1px solid var(--color-border-subtle, rgba(255,255,255,0.08))',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Button
                variant="secondary"
                onClick={() => setStep(1)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <IconChevronLeft size={16} />
                <span>Back</span>
              </Button>

              <Button
                variant="primary"
                onClick={() => {
                  if (validateStep2()) setStep(3);
                }}
                disabled={isRegistrationClosed}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
              >
                <span>Next: Delegate Members</span>
                <IconArrowRight size={16} />
              </Button>
            </div>
          </Card>
        )}

        {/* ============================================================ */}
        {/* STEP 3: Delegate Members                                     */}
        {/* ============================================================ */}
        {step === 3 && (
          <Card
            style={{
              background: 'var(--color-surface, #131822)',
              border: '1px solid var(--color-border-subtle, rgba(255,255,255,0.08))',
              borderRadius: 'var(--radius-lg, 12px)',
              padding: '32px'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--color-primary, #2563EB)' }}>
                    <IconUser size={20} />
                  </span>
                  <h2
                    style={{
                      fontSize: '1.3rem',
                      fontWeight: 700,
                      color: 'var(--color-text-primary, #F8FAFC)',
                      margin: 0
                    }}
                  >
                    Step 3: Team Delegates & Officers
                  </h2>
                </div>
                <p style={{ color: 'var(--color-text-secondary, #94A3B8)', fontSize: '0.875rem', margin: 0 }}>
                  Enter student delegate details (minimum 2, maximum 5 officers). Each delegate receives an official lanyard credential.
                </p>
              </div>

              {members.length < 5 && (
                <Button
                  variant="outline"
                  onClick={addMemberField}
                  style={{ fontSize: '0.825rem', padding: '6px 12px' }}
                >
                  + Add Member ({members.length}/5)
                </Button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              {members.map((member, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr auto',
                    gap: '16px',
                    alignItems: 'center',
                    background: 'var(--color-surface-elevated, #0F131C)',
                    padding: '16px',
                    borderRadius: 'var(--radius-md, 8px)',
                    border: '1px solid var(--color-border-subtle, rgba(255,255,255,0.08))'
                  }}
                >
                  <div>
                    <Input
                      id={`registration-member-${idx}-name`}
                      name={`member_${idx}_name`}
                      label={`Officer ${idx + 1} Name ${idx < 2 ? '*' : ''}`}
                      placeholder="Full Name"
                      value={member.name}
                      onChange={e => handleMemberChange(idx, 'name', e.target.value)}
                    />
                  </div>

                  <div>
                    <Input
                      id={`registration-member-${idx}-role`}
                      name={`member_${idx}_role`}
                      label="Role / Designation"
                      placeholder="e.g. CIO / Sector Specialist"
                      value={member.role}
                      onChange={e => handleMemberChange(idx, 'role', e.target.value)}
                    />
                  </div>

                  <div style={{ paddingTop: '22px' }}>
                    {members.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeMemberField(idx)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-fall, #EF4444)',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'background 0.15s ease'
                        }}
                        title="Remove member"
                        aria-label={`Remove Officer ${idx + 1}`}
                      >
                        <IconX size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: '32px',
                paddingTop: '20px',
                borderTop: '1px solid var(--color-border-subtle, rgba(255,255,255,0.08))',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Button
                variant="secondary"
                onClick={() => setStep(2)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <IconChevronLeft size={16} />
                <span>Back</span>
              </Button>

              <Button
                variant="primary"
                onClick={() => {
                  if (validateStep3()) setStep(4);
                }}
                disabled={isRegistrationClosed}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
              >
                <span>Next: Review & Verify</span>
                <IconArrowRight size={16} />
              </Button>
            </div>
          </Card>
        )}

        {/* ============================================================ */}
        {/* STEP 4: Review & Verification                                */}
        {/* ============================================================ */}
        {step === 4 && (
          <Card
            style={{
              background: 'var(--color-surface, #131822)',
              border: '1px solid var(--color-border-subtle, rgba(255,255,255,0.08))',
              borderRadius: 'var(--radius-lg, 12px)',
              padding: '32px'
            }}
          >
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--color-primary, #2563EB)' }}>
                  <IconClipboardList size={20} />
                </span>
                <h2
                  style={{
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    color: 'var(--color-text-primary, #F8FAFC)',
                    margin: 0
                  }}
                >
                  Step 4: Review Registration Details
                </h2>
              </div>
              <p style={{ color: 'var(--color-text-secondary, #94A3B8)', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
                Please carefully verify all institutional parameters before submitting to the SAAMX Exchange Desk for official authorization.
              </p>
            </div>

            {/* Review Cards Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px',
                background: 'var(--color-surface-elevated, #0F131C)',
                padding: '24px',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid var(--color-border-subtle, rgba(255,255,255,0.08))',
                marginBottom: '24px'
              }}
            >
              <div>
                <h3
                  style={{
                    color: 'var(--color-accent-amber, #D97706)',
                    margin: '0 0 12px 0',
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 700
                  }}
                >
                  Educational Institution
                </h3>
                <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text-primary, #F8FAFC)' }}>
                  {schoolName}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #94A3B8)', marginBottom: '4px' }}>
                  Curriculum: <strong style={{ color: 'var(--color-text-primary, #F8FAFC)' }}>{board}</strong> • City: {city || 'Not specified'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #94A3B8)', marginBottom: '4px' }}>
                  Leader: {contactPerson || 'Lead Delegate'} {contactEmail && `(${contactEmail})`}
                </div>
                {contactPhone && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #94A3B8)', marginBottom: '4px' }}>
                    Phone: {contactPhone}
                  </div>
                )}
                {facultyCoordinator && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #94A3B8)' }}>
                    Faculty: {facultyCoordinator}
                  </div>
                )}
              </div>

              <div>
                <h3
                  style={{
                    color: 'var(--color-accent-amber, #D97706)',
                    margin: '0 0 12px 0',
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 700
                  }}
                >
                  Investment House Identity
                </h3>
                <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text-primary, #F8FAFC)' }}>
                  {investmentHouseName}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #94A3B8)', marginBottom: '4px' }}>
                  Strategy: <strong style={{ color: 'var(--color-text-primary, #F8FAFC)' }}>{teamType}</strong>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #94A3B8)', marginBottom: '4px' }}>
                  Allocated Code: <strong style={{ fontFamily: 'var(--font-mono, monospace)' }}>{preferredTeamCode || 'Auto-allocated (IH01..)'}</strong>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-rise, #10B981)', fontWeight: 600 }}>
                  Starting Capital: ₹{(currentEvent.startingCapital || 10000000).toLocaleString('en-IN')}
                </div>
              </div>

              {/* Delegates Section */}
              <div
                style={{
                  gridColumn: '1 / -1',
                  borderTop: '1px solid var(--color-border-subtle, rgba(255,255,255,0.06))',
                  paddingTop: '16px'
                }}
              >
                <h3
                  style={{
                    color: 'var(--color-accent-amber, #D97706)',
                    margin: '0 0 12px 0',
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 700
                  }}
                >
                  Delegates & Officers ({members.filter(m => m.name.trim() !== '').length})
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                  {members.filter(m => m.name.trim() !== '').map((m, i) => (
                    <div
                      key={i}
                      style={{
                        background: 'var(--color-surface, #131822)',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm, 6px)',
                        border: '1px solid var(--color-border-subtle, rgba(255,255,255,0.08))'
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text-primary, #F8FAFC)' }}>
                        {m.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary, #94A3B8)', marginTop: '2px' }}>
                        {m.role}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Verification Disclaimer */}
            <div
              style={{
                fontSize: '0.825rem',
                color: 'var(--color-text-muted, #64748B)',
                lineHeight: 1.5,
                marginBottom: '24px',
                padding: '12px 16px',
                background: 'var(--color-surface-hover, rgba(255,255,255,0.03))',
                borderRadius: 'var(--radius-sm, 6px)',
                border: '1px solid var(--color-border-subtle, rgba(255,255,255,0.06))'
              }}
            >
              By submitting this registration, the delegation confirms adherence to the official SAAMX Market Conduct Code. Submitted entries are routed to the physical Exchange Desk for credentials verification.
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Button
                variant="secondary"
                onClick={() => setStep(3)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <IconChevronLeft size={16} />
                <span>Edit Details</span>
              </Button>

              <Button
                variant="primary"
                disabled={isSubmitting || isRegistrationClosed}
                onClick={handleSubmitRegistration}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 32px',
                  fontWeight: 700
                }}
              >
                {isSubmitting ? (
                  <span>Submitting Registration...</span>
                ) : (
                  <>
                    <IconCheck size={18} strokeWidth={2.5} />
                    <span>Confirm & Register House</span>
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* ============================================================ */}
        {/* STEP 5: Official Confirmation Pass / Credential Slip        */}
        {/* ============================================================ */}
        {step === 5 && confirmationData && (
          <Card
            style={{
              background: 'var(--color-surface, #131822)',
              border: '2px solid var(--color-rise, #10B981)',
              borderRadius: 'var(--radius-xl, 16px)',
              padding: '36px',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--color-rise, #10B981)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px auto',
                border: '2px solid rgba(16, 185, 129, 0.3)'
              }}
            >
              <IconCheck size={32} strokeWidth={2.5} />
            </div>

            <h2
              style={{
                fontSize: '1.85rem',
                fontWeight: 800,
                color: 'var(--color-text-primary, #F8FAFC)',
                margin: '0 0 8px 0',
                letterSpacing: '-0.02em'
              }}
            >
              Registration Successfully Submitted!
            </h2>
            <p
              style={{
                color: 'var(--color-text-secondary, #94A3B8)',
                fontSize: '0.95rem',
                maxWidth: '540px',
                margin: '0 auto 28px auto',
                lineHeight: 1.5
              }}
            >
              Your Investment House has been recorded in the SAAMX exchange registry. Please present this credential slip at the Exchange Desk upon arrival.
            </p>

            {/* Official Credential Badge (Print Target) */}
            <div
              id="saamx-credential-badge"
              style={{
                background: 'var(--color-surface-elevated, #0F131C)',
                border: '1px dashed var(--color-primary, #38BDF8)',
                borderRadius: 'var(--radius-lg, 12px)',
                padding: '28px',
                textAlign: 'left',
                maxWidth: '560px',
                margin: '0 auto 28px auto',
                boxShadow: 'var(--shadow-lg, 0 10px 25px -5px rgba(0,0,0,0.3))'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  borderBottom: '1px solid var(--color-border-subtle, rgba(255,255,255,0.1))',
                  paddingBottom: '16px',
                  marginBottom: '16px'
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-primary, #38BDF8)',
                      fontWeight: 800,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      marginBottom: '4px'
                    }}
                  >
                    SAAMX OFFICIAL DELEGATE PASS
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF' }}>
                    {confirmationData.investmentHouse?.investmentHouseName}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary, #94A3B8)' }}>
                    {confirmationData.school?.schoolName}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748B)', fontWeight: 700 }}>
                    ASSIGNED CODE
                  </div>
                  <div
                    className="tabular-nums"
                    style={{
                      fontSize: '1.75rem',
                      fontWeight: 900,
                      color: 'var(--color-accent-amber, #F59E0B)',
                      fontFamily: 'var(--font-mono, monospace)',
                      lineHeight: 1.1
                    }}
                  >
                    {confirmationData.teamCode}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748B)', fontWeight: 600 }}>
                    CONSOLE USERNAME
                  </div>
                  <div
                    style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      fontFamily: 'var(--font-mono, monospace)'
                    }}
                  >
                    {confirmationData.teamCode}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748B)', fontWeight: 600 }}>
                    ACCESS PIN / PASSWORD
                  </div>
                  <div
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      color: 'var(--color-rise, #10B981)',
                      fontFamily: 'var(--font-mono, monospace)'
                    }}
                  >
                    {confirmationData.tempPin}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748B)', fontWeight: 600 }}>
                    CLEARANCE DESK
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-primary, #38BDF8)', fontWeight: 800 }}>
                    {confirmationData.assignedDesk
                      ? confirmationData.assignedDesk.replace('_', ' ')
                      : `Desk ${((parseInt(confirmationData.teamCode?.replace(/\D/g, '') || '1', 10) - 1) % 5) + 1} (Intake)`}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748B)', fontWeight: 600 }}>
                    REGISTRATION REF
                  </div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--color-text-secondary, #94A3B8)',
                      fontFamily: 'var(--font-mono, monospace)'
                    }}
                  >
                    {confirmationData.registrationId}
                  </div>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #64748B)', fontWeight: 600 }}>
                    STATUS
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-accent-amber, #F59E0B)', fontWeight: 700 }}>
                    PENDING DESK VERIFICATION
                  </div>
                </div>
              </div>

              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-muted, #64748B)',
                  borderTop: '1px solid var(--color-border-subtle, rgba(255,255,255,0.06))',
                  paddingTop: '12px',
                  lineHeight: 1.4
                }}
              >
                Present this code to the Exchange Administrator upon arrival to activate your ₹10,000,000 portfolio before the opening bell.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                onClick={printBadge}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
              >
                <IconPrinter size={18} />
                <span>Print Credential Slip</span>
              </Button>

              <a href="#/login" style={{ textDecoration: 'none' }}>
                <Button
                  variant="primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: 'var(--color-accent, #2563EB)' }}
                >
                  <span>Proceed to Terminal Sign In</span>
                  <IconArrowRight size={16} />
                </Button>
              </a>

              <Button
                variant="secondary"
                onClick={handleBackToHome}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
              >
                <span>Return to Floor Gateway</span>
                <IconArrowRight size={16} />
              </Button>
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}
