import React, { useState } from 'react';
import {
  TakoyakiCharacter,
  CharacterCreateInput,
  CharacterGenre,
  CharacterStatus,
} from '../types';
import {
  Plus,
  ChefHat,
  Edit3,
  Trash2,
  Upload,
  Check,
  X,
  Flame,
} from 'lucide-react';

interface TakoyakiKitchenProps {
  characters: TakoyakiCharacter[];
  initialEditCharacter?: TakoyakiCharacter | null;
  onSaveCharacter: (input: CharacterCreateInput, existingId?: string) => Promise<void>;
  onDeleteCharacter: (id: string) => Promise<void>;
  onSelectCharacter: (character: TakoyakiCharacter) => void;
  onClearInitialEdit: () => void;
}

const GENRE_OPTIONS: CharacterGenre[] = [
  'Slice of Life',
  'Fantasy',
  'Romance',
  'Mystery',
  'Sci-Fi',
  'Historical',
  'Supernatural',
  'Drama',
  'Adventure',
];

export const TakoyakiKitchen: React.FC<TakoyakiKitchenProps> = ({
  characters,
  initialEditCharacter,
  onSaveCharacter,
  onDeleteCharacter,
  onSelectCharacter,
  onClearInitialEdit,
}) => {
  const [isFormOpen, setIsFormOpen] = useState<boolean>(Boolean(initialEditCharacter));
  const [editingId, setEditingId] = useState<string | undefined>(initialEditCharacter?.id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState(initialEditCharacter?.name || '');
  const [artwork, setArtwork] = useState(initialEditCharacter?.artwork || '');
  const [coverImage, setCoverImage] = useState(initialEditCharacter?.coverImage || '');
  const [shortDescription, setShortDescription] = useState(
    initialEditCharacter?.shortDescription || ''
  );
  const [plot, setPlot] = useState(initialEditCharacter?.plot || '');
  const [personality, setPersonality] = useState(initialEditCharacter?.personality || '');
  const [scenario, setScenario] = useState(initialEditCharacter?.scenario || '');
  const [openingScene, setOpeningScene] = useState(initialEditCharacter?.openingScene || '');
  const [setting, setSetting] = useState(initialEditCharacter?.setting || '');
  const [relationship, setRelationship] = useState(initialEditCharacter?.relationship || '');
  const [genre, setGenre] = useState<CharacterGenre>(
    initialEditCharacter?.genre || 'Slice of Life'
  );
  const [tagsInput, setTagsInput] = useState(
    initialEditCharacter?.tags ? initialEditCharacter.tags.join(', ') : ''
  );
  const [contentWarning, setContentWarning] = useState(
    initialEditCharacter?.contentWarning || ''
  );
  const [creator, setCreator] = useState(
    !initialEditCharacter?.creator || initialEditCharacter.creator === 'Stall Master'
      ? 'Cáo Bel'
      : initialEditCharacter.creator
  );
  const [playUrl, setPlayUrl] = useState(initialEditCharacter?.playUrl || '');
  const [isSpicy, setIsSpicy] = useState<boolean>(Boolean(initialEditCharacter?.is_spicy));
  const [allowsFemale, setAllowsFemale] = useState<boolean>(
    initialEditCharacter?.allowsFemale !== undefined
      ? Boolean(initialEditCharacter.allowsFemale)
      : true
  );
  const [allowsMale, setAllowsMale] = useState<boolean>(
    Boolean(initialEditCharacter?.allowsMale)
  );
  const [imagePosition, setImagePosition] = useState<string>(initialEditCharacter?.imagePosition || 'center');

  // Real statistics computed strictly from actual characters (starts at 0)
  const totalCharacters = characters.length;
  const totalPlays = characters.reduce((acc, c) => acc + (c.playCount || 0), 0);
  const totalFavorites = characters.reduce((acc, c) => acc + (c.favoriteCount || 0), 0);
  const totalViews = characters.reduce((acc, c) => acc + (c.viewCount || 0), 0);

  const openNewCharacterForm = () => {
    setEditingId(undefined);
    setName('');
    setArtwork('');
    setCoverImage('');
    setShortDescription('');
    setPlot('');
    setPersonality('');
    setScenario('');
    setOpeningScene('');
    setSetting('');
    setRelationship('');
    setGenre('Slice of Life');
    setTagsInput('');
    setContentWarning('');
    setCreator('Cáo Bel');
    setPlayUrl('');
    setIsSpicy(false);
    setImagePosition('center');
    setAllowsFemale(true);
    setAllowsMale(false);
    setErrorMsg(null);
    setIsFormOpen(true);
    onClearInitialEdit();
  };

  const openEditForm = (char: TakoyakiCharacter) => {
    setEditingId(char.id);
    setName(char.name);
    setArtwork(char.artwork);
    setCoverImage(char.coverImage || '');
    setShortDescription(char.shortDescription);
    setPlot(char.plot);
    setPersonality(char.personality);
    setScenario(char.scenario);
    setOpeningScene(char.openingScene || '');
    setSetting(char.setting || '');
    setRelationship(char.relationship || '');
    setGenre(char.genre);
    setTagsInput(char.tags.join(', '));
    setContentWarning(char.contentWarning);
    setCreator(!char.creator || char.creator === 'Stall Master' ? 'Cáo Bel' : char.creator);
    setPlayUrl(char.playUrl);
    setIsSpicy(Boolean(char.is_spicy));
    setImagePosition(char.imagePosition || 'center');
    setAllowsFemale(char.allowsFemale !== undefined ? Boolean(char.allowsFemale) : true);
    setAllowsMale(Boolean(char.allowsMale));
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  const handleArtworkFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const dataUrl = reader.result;

      // Compress and resize large images client-side to prevent PayloadTooLargeError
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 900;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setArtwork(compressedDataUrl);
        } else {
          setArtwork(dataUrl);
        }
      };
      img.onerror = () => {
        setArtwork(dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (targetStatus: CharacterStatus) => {
    if (!name.trim()) {
      setErrorMsg('Please enter a Character Name before saving.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      await onSaveCharacter(
        {
          name: name.trim(),
          artwork: artwork.trim(),
          avatar: artwork.trim(),
          coverImage: coverImage.trim() || artwork.trim(),
          shortDescription: shortDescription.trim(),
          plot: plot.trim(),
          personality: personality.trim(),
          scenario: scenario.trim(),
          openingScene: openingScene.trim(),
          setting: setting.trim(),
          relationship: relationship.trim(),
          genre,
          tags: parsedTags,
          contentWarning: contentWarning.trim(),
          creator:
            !creator.trim() || creator.trim() === 'Stall Master' ? 'Cáo Bel' : creator.trim(),
          playUrl: playUrl.trim(),
          is_spicy: isSpicy,
          allowsMale,
          allowsFemale,
          imagePosition,
          status: targetStatus,
        },
        editingId
      );
      setIsFormOpen(false);
      onClearInitialEdit();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save character.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1120px] mx-auto px-4 sm:px-8 py-10">
      {/* Kitchen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-[#E5D3B3]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#C84B31] font-semibold uppercase tracking-widest mb-1">
            <ChefHat className="w-4 h-4 text-[#E8833A]" />
            <span>Back Kitchen · Creator Dashboard</span>
          </div>
          <h1 className="font-display text-2xl sm:text-4xl font-semibold text-[#3D251E]">
            Takoyaki Kitchen
          </h1>
          <p className="text-sm text-[#7A5C4F] mt-1">
            Prepare character batters, write story fillings, and assign batches to the Original or Spicy tray.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewCharacterForm}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E8833A] hover:bg-[#D67229] text-white font-semibold text-sm rounded-lg shadow-sm transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Make New Character</span>
        </button>
      </div>

      {/* Real-Time Kitchen Counters (All start at 0 when stall is empty) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-8">
        <div className="p-5 rounded-xl bg-[#FFFDF9] border border-[#E5D3B3] shadow-sm">
          <p className="text-xs text-[#7A5C4F] mb-1">Characters</p>
          <p className="font-mono-nums text-2xl sm:text-3xl font-semibold text-[#3D251E]">
            {totalCharacters}
          </p>
        </div>
        <div className="p-5 rounded-xl bg-[#FFFDF9] border border-[#E5D3B3] shadow-sm">
          <p className="text-xs text-[#7A5C4F] mb-1">Total Plays</p>
          <p className="font-mono-nums text-2xl sm:text-3xl font-semibold text-[#E8833A]">
            {totalPlays}
          </p>
        </div>
        <div className="p-5 rounded-xl bg-[#FFFDF9] border border-[#E5D3B3] shadow-sm">
          <p className="text-xs text-[#7A5C4F] mb-1">Favorites</p>
          <p className="font-mono-nums text-2xl sm:text-3xl font-semibold text-[#C84B31]">
            {totalFavorites}
          </p>
        </div>
        <div className="p-5 rounded-xl bg-[#FFFDF9] border border-[#E5D3B3] shadow-sm">
          <p className="text-xs text-[#7A5C4F] mb-1">Views</p>
          <p className="font-mono-nums text-2xl sm:text-3xl font-semibold text-[#3D251E]">
            {totalViews}
          </p>
        </div>
      </div>

      {/* Create / Edit Character Form */}
      {isFormOpen && (
        <div className="mb-12 p-6 sm:p-8 rounded-2xl bg-[#FFFDF9] border-2 border-[#D4A373] shadow-lg">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#E5D3B3]">
            <h2 className="font-display text-xl font-semibold text-[#3D251E]">
              {editingId ? 'Edit Takoyaki Character' : 'Create New Takoyaki'}
            </h2>
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                onClearInitialEdit();
              }}
              className="p-1.5 text-[#7A5C4F] hover:text-[#3D251E] rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMsg && (
            <div className="mb-6 p-3.5 rounded-lg bg-[#FDECE8] border border-[#C84B31] text-xs sm:text-sm text-[#C84B31] font-medium">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Core Identity & Artwork */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#3D251E] mb-1.5">
                  Character Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter character name..."
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#FDF8F0] border border-[#D4A373] text-sm text-[#3D251E] focus:outline-none focus:border-[#E8833A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3D251E] mb-1.5">
                  Character Artwork (Upload Image or Paste Image URL)
                </label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#F5EBD9] hover:bg-[#EFE0C5] border border-[#D4A373] text-xs font-semibold text-[#3D251E] cursor-pointer whitespace-nowrap">
                    <Upload className="w-4 h-4 text-[#E8833A]" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleArtworkFileUpload}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="url"
                    value={artwork}
                    onChange={(e) => setArtwork(e.target.value)}
                    placeholder="Or paste image URL..."
                    className="flex-1 px-3.5 py-2 rounded-lg bg-[#FDF8F0] border border-[#D4A373] text-xs sm:text-sm text-[#3D251E] focus:outline-none focus:border-[#E8833A]"
                  />
                </div>
                {artwork && (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#E8833A] bg-[#F5EBD9] shrink-0">
                      <img
                        src={artwork}
                        alt="Artwork preview"
                        referrerPolicy="no-referrer"
                        className={`w-full h-full object-cover object-${imagePosition}`}
                      />
                    </div>
                    <span className="text-xs text-[#7A5C4F]">
                      Preview on the {isSpicy ? 'Spicy' : 'Original'} takoyaki tray
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3D251E] mb-1.5">
                  Short Description
                </label>
                <textarea
                  rows={2}
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="A brief one-line hook shown on previews..."
                  className="w-full px-3.5 py-2 rounded-lg bg-[#FDF8F0] border border-[#D4A373] text-sm text-[#3D251E] focus:outline-none focus:border-[#E8833A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3D251E] mb-1.5">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="slow burn, cozy cafe, childhood friend..."
                  className="w-full px-3.5 py-2 rounded-lg bg-[#FDF8F0] border border-[#D4A373] text-sm text-[#3D251E] focus:outline-none focus:border-[#E8833A]"
                />
              </div>

              {/* IMAGE POSITION CONTROL */}
              <div className="p-4 rounded-xl bg-[#F5EBD9] border border-[#D4A373]">
                <label className="block text-xs font-semibold text-[#3D251E] mb-2">
                  Image Framing (Chỉnh khung ảnh)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['top', 'center', 'bottom'].map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setImagePosition(pos)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        imagePosition === pos
                          ? 'bg-[#E8833A] text-white border-[#D67229]'
                          : 'bg-white text-[#7A5C4F] border-[#D4A373] hover:text-[#3D251E]'
                      }`}
                    >
                      {pos.charAt(0).toUpperCase() + pos.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* SPICY FLAVOR CLASSIFICATION TOGGLE */}
              <div className="p-4 rounded-xl bg-[#F5EBD9] border border-[#D4A373]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Flame
                        className={`w-4 h-4 ${
                          isSpicy ? 'text-[#C84B31] fill-current' : 'text-[#8C6239]'
                        }`}
                      />
                      <span className="text-sm font-semibold text-[#3D251E]">
                        Spicy Flavor
                      </span>
                    </div>
                    <p className="text-xs text-[#7A5C4F] mt-0.5">
                      Enable this to place the character in the Spicy Flavor tray.
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={isSpicy}
                    onClick={() => setIsSpicy((prev) => !prev)}
                    className={`px-4 py-2 rounded-lg text-xs font-mono-nums font-semibold border transition-colors cursor-pointer shrink-0 ${
                      isSpicy
                        ? 'bg-[#C84B31] text-white border-[#A63A22]'
                        : 'bg-white text-[#7A5C4F] border-[#D4A373] hover:text-[#3D251E]'
                    }`}
                  >
                    {isSpicy ? '● ON (Spicy Flavor)' : '○ OFF (Original Flavor)'}
                  </button>
                </div>
              </div>

              {/* PLAYABLE GENDER TOGGLE (GIỚI TÍNH NGƯỜI CHƠI 👫 👬) */}
              <div className="p-4 rounded-xl bg-[#F5EBD9] border border-[#D4A373]">
                <div className="mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base select-none">👫</span>
                    <span className="text-sm font-semibold text-[#3D251E]">
                      Giới tính người chơi hỗ trợ (Playable Gender)
                    </span>
                  </div>
                  <p className="text-xs text-[#7A5C4F] mt-0.5">
                    Đánh dấu giới tính người chơi có thể nhập vai (hiển thị cạnh tên nhân vật).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {/* Chơi được giới nữ 👫 */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={allowsFemale}
                    onClick={() => setAllowsFemale((prev) => !prev)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none ${
                      allowsFemale
                        ? 'bg-[#FFF1F2] border-[#F43F5E] text-[#9F1239] shadow-2xs ring-1 ring-[#FECDD3]'
                        : 'bg-white/80 border-[#D4A373] text-[#7A5C4F] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">👫</span>
                      <span>Giới nữ</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-mono-nums font-bold ${
                        allowsFemale
                          ? 'bg-[#F43F5E] text-white'
                          : 'bg-[#E5D3B3] text-[#7A5C4F]'
                      }`}
                    >
                      {allowsFemale ? 'BẬT (👫)' : 'TẮT'}
                    </span>
                  </button>

                  {/* Chơi được giới nam 👬 */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={allowsMale}
                    onClick={() => setAllowsMale((prev) => !prev)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none ${
                      allowsMale
                        ? 'bg-[#EFF6FF] border-[#3B82F6] text-[#1E40AF] shadow-2xs ring-1 ring-[#BFDBFE]'
                        : 'bg-white/80 border-[#D4A373] text-[#7A5C4F] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">👬</span>
                      <span>Giới nam</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-mono-nums font-bold ${
                        allowsMale
                          ? 'bg-[#3B82F6] text-white'
                          : 'bg-[#E5D3B3] text-[#7A5C4F]'
                      }`}
                    >
                      {allowsMale ? 'BẬT (👬)' : 'TẮT'}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3D251E] mb-1.5">
                  External Play URL
                </label>
                <input
                  type="url"
                  value={playUrl}
                  onChange={(e) => setPlayUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#FDF8F0] border border-[#D4A373] text-sm text-[#3D251E] focus:outline-none focus:border-[#E8833A]"
                />
              </div>
            </div>

            {/* Right Column: The Filling (Plot, Opening Scene, Personality, Scenario) */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#C84B31] mb-1.5">
                  Plot (What&apos;s inside the takoyaki?)
                </label>
                <textarea
                  rows={4}
                  value={plot}
                  onChange={(e) => setPlot(e.target.value)}
                  placeholder="Describe the core story filling and hook..."
                  className="w-full px-3.5 py-2 rounded-lg bg-[#FDF8F0] border border-[#D4A373] text-sm text-[#3D251E] focus:outline-none focus:border-[#E8833A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3D251E] mb-1.5">
                  Opening Scene
                </label>
                <textarea
                  rows={3}
                  value={openingScene}
                  onChange={(e) => setOpeningScene(e.target.value)}
                  placeholder="The first message or opening scene when starting the story..."
                  className="w-full px-3.5 py-2 rounded-lg bg-[#FDF8F0] border border-[#D4A373] text-sm text-[#3D251E] focus:outline-none focus:border-[#E8833A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3D251E] mb-1.5">
                  Small Note
                </label>
                <textarea
                  rows={2}
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  placeholder="Small note, character traits, mannerisms, or remarks..."
                  className="w-full px-3.5 py-2 rounded-lg bg-[#FDF8F0] border border-[#D4A373] text-sm text-[#3D251E] focus:outline-none focus:border-[#E8833A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3D251E] mb-1.5">
                  Scenario
                </label>
                <textarea
                  rows={2}
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  placeholder="Where and how the roleplay begins..."
                  className="w-full px-3.5 py-2 rounded-lg bg-[#FDF8F0] border border-[#D4A373] text-sm text-[#3D251E] focus:outline-none focus:border-[#E8833A]"
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons: Save Draft / Publish */}
          <div className="mt-8 pt-5 border-t border-[#E5D3B3] flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('draft')}
              className="px-5 py-2.5 rounded-lg bg-[#F5EBD9] hover:bg-[#EFE0C5] border border-[#D4A373] text-sm font-semibold text-[#3D251E] transition-colors whitespace-nowrap cursor-pointer"
            >
              Save Draft
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('published')}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#E8833A] hover:bg-[#D67229] text-white text-sm font-semibold shadow-sm transition-colors whitespace-nowrap cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Publish to {isSpicy ? 'Spicy Tray' : 'Original Tray'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Character Inventory List */}
      <div>
        <h2 className="font-display text-lg font-semibold text-[#3D251E] mb-4">
          Kitchen Batch Roster
        </h2>

        {characters.length === 0 ? (
          <div className="p-10 rounded-2xl bg-[#FFFDF9] border border-[#E5D3B3] text-center shadow-sm">
            <p className="font-display text-lg text-[#3D251E] mb-1">
              The preparation counter is clean.
            </p>
            <p className="text-sm text-[#7A5C4F] mb-5">
              You haven&apos;t created any characters yet. Start your first batch when ready.
            </p>
            <button
              type="button"
              onClick={openNewCharacterForm}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E8833A] hover:bg-[#D67229] text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Make New Character</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {characters.map((char) => (
              <div
                key={char.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#FFFDF9] border border-[#E5D3B3] hover:border-[#D4A373] transition-colors shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full p-0.5 shrink-0"
                    style={{
                      background: char.is_spicy
                        ? 'radial-gradient(circle at 30% 25%, #E8833A 0%, #C84B31 60%, #7D2918 100%)'
                        : 'radial-gradient(circle at 30% 25%, #F4B942 0%, #E8833A 60%, #8C6239 100%)',
                    }}
                  >
                    <div className="w-full h-full rounded-full overflow-hidden bg-[#FDF8F0]">
                      {char.artwork ? (
                        <img
                          src={char.artwork}
                          alt={char.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-display text-sm text-[#3D251E]">
                          {char.name.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#7A5C4F] mb-0.5">
                      <span
                        className={
                          char.is_spicy
                            ? 'text-[#C84B31] font-semibold'
                            : 'text-[#8C6239] font-semibold'
                        }
                      >
                        {char.is_spicy ? 'Spicy 🌶' : 'Original'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          char.status === 'published'
                            ? 'text-[#2E7D32] font-medium'
                            : 'text-[#7A5C4F] italic'
                        }
                      >
                        {char.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-nums">{char.playCount} plays</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-nums">{char.favoriteCount} favs</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-nums">{char.viewCount} views</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-base font-semibold text-[#3D251E]">
                        {char.name}
                      </h3>
                      {(char.allowsFemale || char.allowsMale) && (
                        <div className="inline-flex items-center gap-1 select-none text-xs">
                          {char.allowsFemale && <span title="Chơi được giới nữ (👫)">👫</span>}
                          {char.allowsMale && <span title="Chơi được giới nam (👬)">👬</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => onSelectCharacter(char)}
                    className="px-3 py-1.5 text-xs font-medium text-[#3D251E] bg-[#F5EBD9] hover:bg-[#EFE0C5] border border-[#D4A373] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Inspect
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditForm(char)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#E8833A] bg-white hover:bg-[#F5EBD9] border border-[#D4A373] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteCharacter(char.id)}
                    className="p-1.5 text-[#C84B31] hover:text-white hover:bg-[#C84B31] rounded-lg transition-colors cursor-pointer"
                    title="Delete character"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
