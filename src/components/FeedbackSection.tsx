import React, { useState, useMemo, useRef } from 'react';
import { FeedbackReview, FeedbackCreateInput } from '../types';
import {
  Star,
  Camera,
  X,
  ThumbsUp,
  UserCheck,
  EyeOff,
  Trash2,
  MapPin,
  Sparkles,
  Image as ImageIcon,
  Send,
  RotateCw,
} from 'lucide-react';

interface FeedbackSectionProps {
  feedbacks: FeedbackReview[];
  currentUserName: string | null;
  currentUserAvatar: string | null;
  isCreatorMode: boolean;
  onAddFeedback: (input: FeedbackCreateInput) => Promise<void>;
  onMarkHelpful: (id: string) => Promise<void>;
  onDeleteFeedback: (id: string) => Promise<void>;
  onRefreshFeedbacks?: () => Promise<void>;
  isRefreshing?: boolean;
}

const STAR_LABELS: Record<number, string> = {
  1: 'Chưa hợp khẩu vị lắm',
  2: 'Tạm ổn',
  3: 'Cũng ngon miệng',
  4: 'Ngon xuất sắc, đáng thử!',
  5: 'Đỉnh của chóp! 10 điểm không có nhưng!',
};

export const FeedbackSection: React.FC<FeedbackSectionProps> = ({
  feedbacks,
  currentUserName,
  currentUserAvatar,
  isCreatorMode,
  onAddFeedback,
  onMarkHelpful,
  onDeleteFeedback,
  onRefreshFeedbacks,
  isRefreshing = false,
}) => {
  // Review form state
  const [isWriting, setIsWriting] = useState<boolean>(false);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [authorName, setAuthorName] = useState<string>(currentUserName || '');
  const [comment, setComment] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter & Lightbox state
  const [filterStar, setFilterStar] = useState<number | 'all' | 'with-photos'>('all');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('takoyaki_helpful_feedbacks_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Compute Google Maps style rating summary
  const summary = useMemo(() => {
    const total = feedbacks.length;
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;

    for (const f of feedbacks) {
      const r = Math.min(5, Math.max(1, Math.round(f.rating)));
      counts[r] = (counts[r] || 0) + 1;
      sum += r;
    }

    const avg = total > 0 ? (sum / total).toFixed(1) : '5.0';
    return { total, counts, avg: Number(avg), avgText: avg };
  }, [feedbacks]);

  // All customer photos across reviews
  const allReviewPhotos = useMemo(() => {
    const list: { url: string; author: string; rating: number }[] = [];
    for (const fb of feedbacks) {
      if (Array.isArray(fb.photos)) {
        for (const p of fb.photos) {
          list.push({
            url: p,
            author: fb.isAnonymous ? 'Thực khách ẩn danh' : fb.authorName,
            rating: fb.rating,
          });
        }
      }
    }
    return list;
  }, [feedbacks]);

  // Filtered reviews
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((fb) => {
      if (filterStar === 'all') return true;
      if (filterStar === 'with-photos') return fb.photos && fb.photos.length > 0;
      return Math.round(fb.rating) === filterStar;
    });
  }, [feedbacks, filterStar]);

  // Handle uploading & compressing photos
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 4 - photos.length;
    const selectedFiles = Array.from(files).slice(0, remainingSlots);

    selectedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (typeof result === 'string') {
          setPhotos((prev) => (prev.length < 4 ? [...prev, result] : prev));
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (rating < 1 || rating > 5) {
      setErrorMsg('Vui lòng chọn số sao đánh giá nha!');
      return;
    }

    if (!comment.trim() && photos.length === 0) {
      setErrorMsg('Hãy viết vài dòng cảm nhận hoặc đính kèm ảnh chiếc bánh takoyaki nhé!');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddFeedback({
        authorName: isAnonymous
          ? 'Thực khách ẩn danh'
          : authorName.trim() || currentUserName || 'Khách ghé quầy',
        authorAvatar: !isAnonymous && currentUserAvatar ? currentUserAvatar : '',
        isAnonymous,
        rating,
        comment: comment.trim(),
        photos,
      });

      // Reset form
      setComment('');
      setPhotos([]);
      setRating(5);
      setIsWriting(false);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Không thể gửi đánh giá lúc này. Thử lại nhé!'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleHelpful = async (id: string) => {
    if (likedIds.includes(id)) return;
    const next = [...likedIds, id];
    setLikedIds(next);
    try {
      localStorage.setItem('takoyaki_helpful_feedbacks_v1', JSON.stringify(next));
    } catch {
      // ignore
    }
    await onMarkHelpful(id);
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="max-w-[1120px] mx-auto px-4 sm:px-8 py-8 sm:py-10">
      {/* =================================================================== */}
      {/* GOOGLE MAPS STYLE PLACE HEADER & RATING OVERVIEW                    */}
      {/* =================================================================== */}
      <div className="bg-[#FFFDF9] border border-[#E5D3B3] rounded-[28px] p-6 sm:p-8 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#EFE4D2]">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E57C29] bg-[#FDF3E7] px-3 py-1 rounded-full mb-2.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>Quầy takoyaki Cáo Bel</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#432314]">
              Ăn xong ròi thì review nhế?
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {onRefreshFeedbacks && (
              <button
                type="button"
                onClick={() => onRefreshFeedbacks()}
                disabled={isRefreshing}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-full bg-[#FAF5EB] hover:bg-[#F5EBD9] border border-[#E5D3B3] text-[#432314] font-semibold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                title="Làm mới để tải các đánh giá mới nhất từ mọi thực khách"
              >
                <RotateCw
                  className={`w-3.5 h-3.5 text-[#E57C29] ${isRefreshing ? 'animate-spin' : ''}`}
                />
                <span>{isRefreshing ? 'Đang cập nhật...' : 'Làm mới'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (!authorName && currentUserName) {
                  setAuthorName(currentUserName);
                }
                setIsWriting((prev) => !prev);
              }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#E57C29] hover:bg-[#D46B1A] text-white font-semibold text-sm shadow-sm transition-transform active:scale-95 cursor-pointer shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isWriting ? 'Đóng khung viết' : 'Viết đánh giá'}</span>
            </button>
          </div>
        </div>

        {/* Rating Breakdown Grid (Google Maps Style) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-6 items-center">
          {/* Left: Big Score Number & Stars */}
          <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-4 rounded-2xl bg-[#FAF5EB] border border-[#EFE4D2]">
            <div className="font-display text-5xl font-bold text-[#432314] tracking-tight">
              {summary.avgText}
            </div>
            <div className="flex items-center gap-1 my-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(summary.avg)
                      ? 'text-[#F59E0B] fill-[#F59E0B]'
                      : 'text-[#D8C6B0]'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs font-medium text-[#7A5C4F]">
              {summary.total === 0
                ? 'Chưa có bài đánh giá nào'
                : `Dựa trên ${summary.total} đánh giá từ thực khách`}
            </p>
          </div>

          {/* Right: 5-Star Horizontal Progress Bars */}
          <div className="md:col-span-8 space-y-2.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = summary.counts[star] || 0;
              const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterStar(filterStar === star ? 'all' : star)}
                    className="flex items-center gap-1 w-12 font-semibold text-[#432314] hover:text-[#E57C29] cursor-pointer shrink-0"
                  >
                    <span>{star}</span>
                    <Star className="w-3.5 h-3.5 text-[#F59E0B] fill-[#F59E0B]" />
                  </button>
                  <div className="flex-1 h-2.5 rounded-full bg-[#EFE4D2] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#F59E0B] transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-9 text-right text-[#7A5C4F] font-medium shrink-0">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Customer Photo Strip if photos exist */}
        {allReviewPhotos.length > 0 && (
          <div className="mt-6 pt-6 border-t border-[#EFE4D2]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A5C4F] flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#E57C29]" />
                <span>Ảnh thực khách chụp tại quầy ({allReviewPhotos.length})</span>
              </h3>
            </div>
            <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
              {allReviewPhotos.slice(0, 10).map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setLightboxImage(item.url)}
                  className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border border-[#E5D3B3] shrink-0 group cursor-pointer"
                >
                  <img
                    src={item.url}
                    alt={`Ảnh của ${item.author}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-1.5 text-left">
                    <span className="text-[10px] text-white font-medium truncate block">
                      {item.author}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* WRITE A REVIEW FORM (COLLAPSIBLE GOOGLE MAPS REVIEW COMPOSER)       */}
      {/* =================================================================== */}
      {isWriting && (
        <form
          onSubmit={handleSubmit}
          className="bg-[#FFFDF9] border-2 border-[#E57C29] rounded-[28px] p-6 sm:p-8 shadow-md mb-8 transition-all"
        >
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#EFE4D2]">
            <div>
              <h2 className="font-display text-xl font-bold text-[#432314]">
                Đánh giá Xe Takoyaki Cáo Bel
              </h2>
              <p className="text-xs text-[#7A5C4F] mt-0.5">
                Chia sẻ trải nghiệm ăn bánh của bạn cho chủ quầy và mọi người cùng biết nhé!
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsWriting(false)}
              className="p-1.5 text-[#7A5C4F] hover:text-[#432314] rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#FDECE8] border border-[#C84B31] text-xs text-[#C84B31] font-semibold">
              {errorMsg}
            </div>
          )}

          {/* 1. Anonymous vs Public Identity Toggle */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#684932] mb-2.5">
              Chế độ hiển thị tên
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsAnonymous(false)}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  !isAnonymous
                    ? 'bg-[#FDF3E7] border-[#E57C29] shadow-2xs'
                    : 'bg-[#FAF5EB] border-[#E5D3B3] opacity-75 hover:opacity-100'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-[#E57C29] text-white flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-sm font-bold text-[#432314]">
                    Không ẩn danh (Hiện tên)
                  </div>
                  <div className="text-xs text-[#7A5C4F] truncate">
                    Đăng kèm biệt danh hoặc tên của bạn
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsAnonymous(true)}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  isAnonymous
                    ? 'bg-[#FDF3E7] border-[#E57C29] shadow-2xs'
                    : 'bg-[#FAF5EB] border-[#E5D3B3] opacity-75 hover:opacity-100'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-[#432314] text-[#FAF5EB] flex items-center justify-center shrink-0">
                  <EyeOff className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-sm font-bold text-[#432314]">
                    Feedback Ẩn danh
                  </div>
                  <div className="text-xs text-[#7A5C4F] truncate">
                    Hiển thị là “Thực khách ẩn danh”
                  </div>
                </div>
              </button>
            </div>

            {/* Name input when NOT anonymous */}
            {!isAnonymous && (
              <div className="mt-3">
                <label className="block text-xs font-semibold text-[#684932] mb-1">
                  Tên hoặc biệt danh của bạn
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Ví dụ: Khách quen mê bạch tuộc, Cáo nhỏ..."
                  maxLength={60}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FAF5EB] border border-[#D4A373] text-sm text-[#432314] placeholder-[#9C8270] focus:outline-none focus:border-[#E57C29]"
                />
              </div>
            )}
          </div>

          {/* 2. Interactive 5-Star Selector */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#684932] mb-2">
              Chấm điểm món bánh
            </label>
            <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-[#FAF5EB] border border-[#EFE4D2]">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = star <= (hoverRating || rating);
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform hover:scale-115 cursor-pointer focus:outline-none"
                      aria-label={`${star} sao`}
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          active
                            ? 'text-[#F59E0B] fill-[#F59E0B]'
                            : 'text-[#D4C3B0] hover:text-[#F59E0B]'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="text-sm font-semibold text-[#432314] bg-[#FFFDF9] px-3 py-1 rounded-full border border-[#E5D3B3]">
                {STAR_LABELS[hoverRating || rating]}
              </span>
            </div>
          </div>

          {/* 3. Review Textarea */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#684932] mb-2">
              Lời nhắn / Nhận xét của bạn
            </label>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Chia sẻ cảm nhận của bạn về các mẻ bánh Takoyaki, cốt truyện, nhân vật bạn thích nhất hoặc góp ý cho chủ quầy Cáo Bel..."
              maxLength={2500}
              className="w-full p-4 rounded-2xl bg-[#FAF5EB] border border-[#D4A373] text-sm text-[#432314] placeholder-[#9C8270] focus:outline-none focus:border-[#E57C29] leading-relaxed"
            />
          </div>

          {/* 4. Photo Uploader (Up to 4 photos) */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#684932]">
                Đính kèm hình ảnh (Tối đa 4 ảnh)
              </label>
              <span className="text-xs text-[#7A5C4F]">{photos.length}/4 ảnh</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {photos.map((src, idx) => (
                <div
                  key={idx}
                  className="relative w-24 h-24 rounded-2xl overflow-hidden border border-[#D4A373] bg-[#FAF5EB] group"
                >
                  <img
                    src={src}
                    alt={`Upload ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-[#C84B31] transition-colors cursor-pointer"
                    title="Xoá ảnh"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {photos.length < 4 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-2xl border-2 border-dashed border-[#D4A373] hover:border-[#E57C29] bg-[#FAF5EB] hover:bg-[#FDF3E7] flex flex-col items-center justify-center gap-1 text-[#684932] hover:text-[#E57C29] transition-colors cursor-pointer"
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-[11px] font-semibold">Thêm ảnh</span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Submit Row */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EFE4D2]">
            <button
              type="button"
              onClick={() => setIsWriting(false)}
              className="px-5 py-2.5 rounded-full text-sm font-semibold text-[#7A5C4F] hover:text-[#432314] cursor-pointer"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#E57C29] hover:bg-[#D46B1A] text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang đăng...' : 'Đăng đánh giá'}</span>
            </button>
          </div>
        </form>
      )}

      {/* =================================================================== */}
      {/* FILTER CHIPS BAR                                                    */}
      {/* =================================================================== */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
        <button
          type="button"
          onClick={() => setFilterStar('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
            filterStar === 'all'
              ? 'bg-[#432314] text-white'
              : 'bg-[#F5EBD9] text-[#684932] hover:bg-[#EBDDC8]'
          }`}
        >
          Tất cả ({feedbacks.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterStar('with-photos')}
          className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
            filterStar === 'with-photos'
              ? 'bg-[#432314] text-white'
              : 'bg-[#F5EBD9] text-[#684932] hover:bg-[#EBDDC8]'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Có hình ảnh ({feedbacks.filter((f) => f.photos?.length > 0).length})</span>
        </button>
        {[5, 4, 3, 2, 1].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setFilterStar(star)}
            className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
              filterStar === star
                ? 'bg-[#E57C29] text-white'
                : 'bg-[#F5EBD9] text-[#684932] hover:bg-[#EBDDC8]'
            }`}
          >
            <span>{star}</span>
            <Star className="w-3 h-3 fill-current" />
          </button>
        ))}
      </div>

      {/* =================================================================== */}
      {/* GOOGLE MAPS STYLE REVIEW CARDS LIST                                 */}
      {/* =================================================================== */}
      {filteredFeedbacks.length === 0 ? (
        <div className="bg-[#FFFDF9] border border-[#E5D3B3] rounded-[24px] p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-[#FAF5EB] border border-[#E5D3B3] flex items-center justify-center mx-auto mb-3 text-[#E57C29]">
            <Star className="w-7 h-7" />
          </div>
          <h3 className="font-display text-lg font-bold text-[#432314] mb-1">
            Chưa có bài đánh giá nào ở mục này
          </h3>
          <p className="text-xs sm:text-sm text-[#7A5C4F] max-w-md mx-auto mb-5">
            Hãy là thực khách đầu tiên chấm sao và để lại feedback cho Xe Takoyaki Cáo Bel nhé!
          </p>
          {!isWriting && (
            <button
              type="button"
              onClick={() => setIsWriting(true)}
              className="px-5 py-2.5 rounded-full bg-[#E57C29] hover:bg-[#D46B1A] text-white text-xs sm:text-sm font-semibold cursor-pointer"
            >
              Viết đánh giá đầu tiên
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFeedbacks.map((fb) => {
            const hasLiked = likedIds.includes(fb.id);
            const displayName = fb.isAnonymous ? 'Thực khách ẩn danh' : fb.authorName;

            return (
              <article
                key={fb.id}
                className="bg-[#FFFDF9] border border-[#E5D3B3] rounded-[24px] p-5 sm:p-6 shadow-2xs transition-colors"
              >
                {/* Reviewer Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {fb.isAnonymous ? (
                      <div className="w-11 h-11 rounded-full bg-[#432314] text-[#FAF5EB] flex items-center justify-center shrink-0 border border-[#D4A373]">
                        <EyeOff className="w-5 h-5" />
                      </div>
                    ) : fb.authorAvatar ? (
                      <img
                        src={fb.authorAvatar}
                        alt={displayName}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-full object-cover shrink-0 border border-[#D4A373]"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-[#E57C29] text-white font-display font-bold text-base flex items-center justify-center shrink-0">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-display text-sm sm:text-base font-bold text-[#432314]">
                          {displayName}
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            fb.isAnonymous
                              ? 'bg-[#EFE4D2] text-[#684932]'
                              : 'bg-[#FDF3E7] text-[#E57C29]'
                          }`}
                        >
                          {fb.isAnonymous ? 'Ẩn danh' : 'Thực khách Quầy Cáo Bel'}
                        </span>
                      </div>

                      {/* Star Row & Date */}
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= fb.rating
                                  ? 'text-[#F59E0B] fill-[#F59E0B]'
                                  : 'text-[#D8C6B0]'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-[#846C5B]">
                          · {formatDate(fb.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Creator Delete Button */}
                  {isCreatorMode && (
                    <button
                      type="button"
                      onClick={() => onDeleteFeedback(fb.id)}
                      className="p-2 text-[#846C5B] hover:text-[#C84B31] rounded-lg hover:bg-[#FDECE8] transition-colors cursor-pointer"
                      title="Xoá feedback này (Chủ quầy)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Review Comment Body */}
                {fb.comment && (
                  <p className="mt-3.5 text-sm text-[#432314] leading-relaxed whitespace-pre-line">
                    {fb.comment}
                  </p>
                )}

                {/* Attached Photos Grid */}
                {fb.photos && fb.photos.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    {fb.photos.map((photoUrl, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => setLightboxImage(photoUrl)}
                        className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border border-[#E5D3B3] group cursor-pointer"
                      >
                        <img
                          src={photoUrl}
                          alt={`Ảnh review ${pIdx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Helpful Action Footer */}
                <div className="mt-4 pt-3 border-t border-[#F5EBD9] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleToggleHelpful(fb.id)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                      hasLiked
                        ? 'bg-[#FDF3E7] text-[#E57C29] border border-[#E57C29]'
                        : 'bg-[#FAF5EB] text-[#684932] hover:bg-[#EFE4D2] border border-[#E5D3B3]'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>
                      Hữu ích {fb.helpfulCount > 0 ? `(${fb.helpfulCount})` : ''}
                    </span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* =================================================================== */}
      {/* FULLSCREEN PHOTO LIGHTBOX MODAL                                     */}
      {/* =================================================================== */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 p-2 rounded-full bg-white/15 hover:bg-white/30 text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImage}
              alt="Xem ảnh lớn"
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[82vh] rounded-2xl object-contain shadow-2xl border border-white/20"
            />
          </div>
        </div>
      )}
    </div>
  );
};
