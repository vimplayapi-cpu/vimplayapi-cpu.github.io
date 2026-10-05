'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAdmin } from './AdminShell';
import { MediaPicker } from './MediaPicker';
import { Card, ConfirmButton, SaveStatus, type SaveState } from './ui';
import { SelectField, TextArea, TextField } from '@/components/forms/Field';
import { Button } from '@/components/ui';

export interface StudioFormValues {
  id: number | null;
  slug: string;
  code: string;
  name: string;
  tagline: string;
  description: string;
  environment: string;
  capacity: string;
  characteristics: string[];
  capabilities: { label: string; value: string }[];
  locationId: number | null;
  status: string;
  availabilityNote: string;
  accent: string;
  ctaLabel: string;
  seoTitle: string;
  seoDescription: string;
  isPublished: boolean;
  images: {
    id: number;
    role: string;
    position: number;
    alt: string;
    caption: string;
    mediaId: number | null;
    thumb: string | null;
  }[];
  video: { mediaId: number | null; posterMediaId: number | null; title: string; caption: string } | null;
}

const ROLE_LABEL: Record<string, string> = {
  wide: 'IMAGE 01 — Wide environment',
  alt: 'IMAGE 02 — Alternate camera angle',
  detail: 'IMAGE 03 — Production / detail angle',
  tech: 'IMAGE 04 — Close technical / environment angle',
};

/**
 * Studio create + edit form.
 *
 * Image slots and the video slot are saved independently of the main record so
 * an editor can attach media without re-submitting the whole studio, and so a
 * validation failure in the text fields never loses a media assignment.
 */
export function StudioEditor({
  initial,
  locations,
}: {
  initial: StudioFormValues;
  locations: { id: number; country: string }[];
}) {
  const { api, can } = useAdmin();
  const router = useRouter();
  const isNew = initial.id === null;

  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<SaveState>({ status: 'idle' });

  const canPublish = can('content.publish');
  const canWrite = can('content.write');

  const set = <K extends keyof StudioFormValues>(key: K, value: StudioFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState({ status: 'saving' });
    setErrors({});

    const payload = {
      slug: values.slug,
      code: values.code,
      name: values.name,
      tagline: values.tagline,
      description: values.description,
      environment: values.environment,
      capacity: values.capacity,
      production_characteristics: values.characteristics.filter(Boolean),
      technical_capabilities: values.capabilities.filter((c) => c.label),
      location_id: values.locationId,
      status: values.status,
      availability_note: values.availabilityNote,
      accent: values.accent,
      cta_label: values.ctaLabel,
      seo_title: values.seoTitle,
      seo_description: values.seoDescription,
      is_published: values.isPublished,
    };

    const res = await api(isNew ? '/api/admin/studios' : `/api/admin/studios/${values.id}`, {
      method: isNew ? 'POST' : 'PUT',
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => null);

    if (res.ok && json?.ok) {
      setState({ status: 'saved' });
      if (isNew) {
        router.push(`/admin/studios/${json.data.id}`);
        return;
      }
      router.refresh();
      return;
    }

    setErrors((json?.error?.details as Record<string, string>) ?? {});
    setState({ status: 'error', message: json?.error?.message ?? 'Save failed' });
  }

  async function saveImageSlot(position: number, mediaId: number | null, alt: string, caption: string) {
    if (isNew) return;
    setState({ status: 'saving' });
    const res = await api(`/api/admin/studios/${values.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ position, media_id: mediaId, alt, caption }),
    });
    if (res.ok) {
      setState({ status: 'saved' });
      router.refresh();
    } else {
      const json = await res.json().catch(() => null);
      setState({ status: 'error', message: json?.error?.message ?? 'Could not save image' });
    }
  }

  async function saveVideo(mediaId: number | null, posterId: number | null, title: string, caption: string) {
    if (isNew) return;
    setState({ status: 'saving' });
    const res = await api(`/api/admin/studios/${values.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        video_media_id: mediaId,
        poster_media_id: posterId,
        title,
        caption,
      }),
    });
    if (res.ok) {
      setState({ status: 'saved' });
      router.refresh();
    } else {
      const json = await res.json().catch(() => null);
      setState({ status: 'error', message: json?.error?.message ?? 'Could not save video' });
    }
  }

  return (
    <form onSubmit={save} noValidate className="space-y-8">
      {/* Core */}
      <Card>
        <h2 className="tech-label mb-6">Identity</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Name" name="name" required error={errors.name}
            value={values.name}
            onChange={(v) => set('name', v)}
          />
          <TextField
            label="Slug" name="slug" required hint="Lowercase, hyphenated. Used in the URL." error={errors.slug}
            value={values.slug}
            onChange={(v) => set('slug', v)}
          />
          <TextField
            label="Code" name="code" hint="e.g. STUDIO 01" error={errors.code}
            value={values.code}
            onChange={(v) => set('code', v)}
          />
          <TextField
            label="Tagline" name="tagline" error={errors.tagline}
            value={values.tagline}
            onChange={(v) => set('tagline', v)}
          />
        </div>
      </Card>

      {/* Description */}
      <Card>
        <h2 className="tech-label mb-6">Description</h2>
        <div className="space-y-5">
          <TextArea
            label="Description" name="description" rows={5} error={errors.description}
            value={values.description}
            onChange={(v) => set('description', v)}
          />
          <TextArea
            label="Environment / set & coverage" name="environment" rows={4} error={errors.environment}
            value={values.environment}
            onChange={(v) => set('environment', v)}
          />
          <ListEditor
            label="Production characteristics"
            values={values.characteristics}
            onChange={(next) => set('characteristics', next)}
          />
        </div>
      </Card>

      {/* Operations */}
      <Card>
        <h2 className="tech-label mb-6">Operations</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Capacity" name="capacity"
            hint="Leave a bracketed placeholder until the real figure is known."
            error={errors.capacity}
            value={values.capacity}
            onChange={(v) => set('capacity', v)}
          />
          <SelectField
            label="Status" name="status" required
            options={[
              { value: 'available', label: 'Available' },
              { value: 'limited', label: 'Limited availability' },
              { value: 'in_production', label: 'In production' },
              { value: 'unavailable', label: 'Unavailable' },
            ]}
            value={values.status}
            placeholder="Select status"
            error={errors.status}
            onChange={(v) => set('status', v)}
          />
          <SelectField
            label="Location" name="location_id"
            options={locations.map((l) => ({ value: String(l.id), label: l.country }))}
            value={values.locationId ? String(values.locationId) : ''}
            placeholder="Unassigned"
            error={errors.location_id}
            onChange={(v) => set('locationId', v ? Number(v) : null)}
          />
          <TextField
            label="Availability note" name="availability_note" error={errors.availability_note}
            value={values.availabilityNote}
            onChange={(v) => set('availabilityNote', v)}
          />
        </div>

        <div className="mt-6">
          <SpecEditor
            values={values.capabilities}
            onChange={(next) => set('capabilities', next)}
          />
        </div>
      </Card>

      {/* Presentation */}
      <Card>
        <h2 className="tech-label mb-6">Presentation</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="accent" className="field-label">
              Accent colour
            </label>
            <div className="flex gap-3">
              <input
                id="accent"
                type="color"
                value={values.accent}
                onChange={(e) => set('accent', e.target.value)}
                className="h-12 w-16 shrink-0 cursor-pointer border border-hairline bg-midnight"
                aria-label="Accent colour picker"
              />
              <input
                type="text"
                value={values.accent}
                onChange={(e) => set('accent', e.target.value)}
                className="field-input font-mono"
                aria-label="Accent colour hex value"
              />
            </div>
            {errors.accent && <p className="field-error">{errors.accent}</p>}
          </div>
          <TextField
            label="CTA label" name="cta_label" error={errors.cta_label}
            value={values.ctaLabel}
            onChange={(v) => set('ctaLabel', v)}
          />
        </div>
      </Card>

      {/* SEO */}
      <Card>
        <h2 className="tech-label mb-6">SEO</h2>
        <div className="space-y-5">
          <TextField
            label="SEO title" name="seo_title" error={errors.seo_title}
            value={values.seoTitle}
            onChange={(v) => set('seoTitle', v)}
          />
          <TextArea
            label="SEO description" name="seo_description" rows={3} error={errors.seo_description}
            value={values.seoDescription}
            onChange={(v) => set('seoDescription', v)}
          />
        </div>
      </Card>

      {/* Publish + save */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-6">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={values.isPublished}
              disabled={!canPublish}
              onChange={(e) => set('isPublished', e.target.checked)}
              className="h-4 w-4 accent-[#3DDCE8]"
            />
            <span className="font-mono text-tech uppercase text-chalk">
              Published
              {!canPublish && <span className="ml-2 text-muted">(requires publish permission)</span>}
            </span>
          </label>

          <div className="flex items-center gap-5">
            <SaveStatus state={state} />
            <Button type="submit" disabled={state.status === 'saving' || !canWrite}>
              {isNew ? 'CREATE STUDIO' : 'SAVE CHANGES'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Media — only once the record exists */}
      {!isNew && (
        <>
          <Card>
            <h2 className="tech-label mb-2">Images</h2>
            <p className="mb-6 text-xs text-muted">
              Four reference frames per studio. Each slot has a fixed role so the public gallery
              composition stays consistent across every environment.
            </p>

            <div className="grid gap-6 sm:grid-cols-2">
              {values.images.map((img) => (
                <ImageSlot
                  key={img.position}
                  label={ROLE_LABEL[img.role] ?? `IMAGE 0${img.position}`}
                  slot={img}
                  disabled={!canWrite}
                  onSave={(mediaId, alt, caption) => saveImageSlot(img.position, mediaId, alt, caption)}
                />
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="tech-label mb-2">Video</h2>
            <p className="mb-6 text-xs text-muted">
              One cinematic studio video. Videos are lazy-loaded behind a poster frame and never
              autoplay with sound.
            </p>
            <VideoSlot
              video={values.video}
              disabled={!canWrite}
              onSave={saveVideo}
            />
          </Card>
        </>
      )}
    </form>
  );
}

/** Editable list of free-text lines. */
function ListEditor({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className="field-label">{label}</legend>
      <div className="space-y-2">
        {values.map((v, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={v}
              onChange={(e) => {
                const next = [...values];
                next[i] = e.target.value;
                onChange(next);
              }}
              className="field-input"
              aria-label={`${label} item ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, idx) => idx !== i))}
              aria-label={`Remove item ${i + 1}`}
              className="shrink-0 px-3 font-mono text-tech-sm uppercase text-muted hover:text-live"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...values, ''])}
        className="mt-3 font-mono text-tech-sm uppercase text-signal"
      >
        + Add row
      </button>
    </fieldset>
  );
}

/** Editable label/value specification rows. */
function SpecEditor({
  values,
  onChange,
}: {
  values: { label: string; value: string }[];
  onChange: (next: { label: string; value: string }[]) => void;
}) {
  return (
    <fieldset>
      <legend className="field-label">Technical capabilities</legend>
      <p className="mb-3 text-xs text-muted">
        Leave a bracketed placeholder for any specification that has not been confirmed — the public
        page renders it as pending rather than as a real value.
      </p>
      <div className="space-y-2">
        {values.map((row, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={row.label}
              placeholder="Label"
              onChange={(e) => {
                const next = [...values];
                next[i] = { ...next[i], label: e.target.value };
                onChange(next);
              }}
              className="field-input"
              aria-label={`Specification ${i + 1} label`}
            />
            <input
              type="text"
              value={row.value}
              placeholder="Value"
              onChange={(e) => {
                const next = [...values];
                next[i] = { ...next[i], value: e.target.value };
                onChange(next);
              }}
              className="field-input"
              aria-label={`Specification ${i + 1} value`}
            />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, idx) => idx !== i))}
              aria-label={`Remove specification ${i + 1}`}
              className="shrink-0 px-3 font-mono text-tech-sm uppercase text-muted hover:text-live"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...values, { label: '', value: '' }])}
        className="mt-3 font-mono text-tech-sm uppercase text-signal"
      >
        + Add specification
      </button>
    </fieldset>
  );
}

function ImageSlot({
  label,
  slot,
  disabled,
  onSave,
}: {
  label: string;
  slot: StudioFormValues['images'][number];
  disabled: boolean;
  onSave: (mediaId: number | null, alt: string, caption: string) => void;
}) {
  const [mediaId, setMediaId] = useState(slot.mediaId);
  const [thumb, setThumb] = useState(slot.thumb);
  const [alt, setAlt] = useState(slot.alt);
  const [caption, setCaption] = useState(slot.caption);
  const [picking, setPicking] = useState(false);

  return (
    <div className="border border-hairline p-4">
      <p className="tech-label mb-3">{label}</p>

      <div className="mb-4 aspect-[4/3] w-full overflow-hidden border border-hairline bg-midnight">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview only
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="font-mono text-tech-sm uppercase text-muted">No image</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="field-label">Alt text</label>
          <input
            type="text"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            className="field-input"
            placeholder="Describe the image for screen readers"
          />
        </div>
        <div>
          <label className="field-label">Caption</label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="field-input"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setPicking(true)}
          className="font-mono text-tech-sm uppercase text-signal disabled:opacity-40"
        >
          {mediaId ? 'Replace image' : 'Choose image'}
        </button>
        {mediaId && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setMediaId(null);
              setThumb(null);
              onSave(null, alt, caption);
            }}
            className="font-mono text-tech-sm uppercase text-muted hover:text-live disabled:opacity-40"
          >
            Clear
          </button>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSave(mediaId, alt, caption)}
          className="ml-auto font-mono text-tech-sm uppercase text-chalk disabled:opacity-40"
        >
          Save slot
        </button>
      </div>

      {picking && (
        <MediaPicker
          kind="image"
          onClose={() => setPicking(false)}
          onSelect={(item) => {
            setMediaId(item.id);
            setThumb(item.thumb);
            setPicking(false);
            onSave(item.id, alt || item.alt, caption);
          }}
        />
      )}
    </div>
  );
}

function VideoSlot({
  video,
  disabled,
  onSave,
}: {
  video: StudioFormValues['video'];
  disabled: boolean;
  onSave: (mediaId: number | null, posterId: number | null, title: string, caption: string) => void;
}) {
  const [mediaId, setMediaId] = useState(video?.mediaId ?? null);
  const [posterId, setPosterId] = useState(video?.posterMediaId ?? null);
  const [title, setTitle] = useState(video?.title ?? '');
  const [caption, setCaption] = useState(video?.caption ?? '');
  const [picking, setPicking] = useState<'video' | 'poster' | null>(null);

  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="field-label">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="field-input" />
        </div>
        <div>
          <label className="field-label">Caption</label>
          <input type="text" value={caption} onChange={(e) => setCaption(e.target.value)} className="field-input" />
        </div>
      </div>

      <dl className="mt-5 space-y-2 border border-hairline p-4">
        <div className="flex items-center justify-between gap-4">
          <dt className="font-mono text-tech-sm uppercase text-muted">Video file</dt>
          <dd className="font-mono text-tech-sm uppercase text-chalk">
            {mediaId ? `Media #${mediaId}` : 'None'}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="font-mono text-tech-sm uppercase text-muted">Poster frame</dt>
          <dd className="font-mono text-tech-sm uppercase text-chalk">
            {posterId ? `Media #${posterId}` : 'None'}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setPicking('video')}
          className="font-mono text-tech-sm uppercase text-signal disabled:opacity-40"
        >
          {mediaId ? 'Replace video' : 'Choose video'}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setPicking('poster')}
          className="font-mono text-tech-sm uppercase text-signal disabled:opacity-40"
        >
          {posterId ? 'Replace poster' : 'Choose poster'}
        </button>
        {mediaId && (
          <ConfirmButton
            label="Clear video"
            confirmLabel="Clear?"
            onConfirm={() => {
              setMediaId(null);
              onSave(null, posterId, title, caption);
            }}
          />
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSave(mediaId, posterId, title, caption)}
          className="ml-auto font-mono text-tech-sm uppercase text-chalk disabled:opacity-40"
        >
          Save video
        </button>
      </div>

      {picking && (
        <MediaPicker
          kind={picking === 'video' ? 'video' : 'image'}
          onClose={() => setPicking(null)}
          onSelect={(item) => {
            if (picking === 'video') {
              setMediaId(item.id);
              onSave(item.id, posterId, title, caption);
            } else {
              setPosterId(item.id);
              onSave(mediaId, item.id, title, caption);
            }
            setPicking(null);
          }}
        />
      )}
    </div>
  );
}
