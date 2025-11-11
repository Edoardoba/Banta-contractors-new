export default function ProfessionalCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border-2 border-transparent">
      <div className="flex">
        {/* Image skeleton */}
        <div className="w-64 h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex-shrink-0 skeleton" />

        {/* Content skeleton */}
        <div className="flex-1 p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-3">
              {/* Name */}
              <div className="h-7 w-48 skeleton" />
              {/* Category */}
              <div className="h-5 w-32 skeleton" />
            </div>
            {/* Heart icon */}
            <div className="h-10 w-10 rounded-full skeleton" />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="h-4 w-full skeleton" />
            <div className="h-4 w-5/6 skeleton" />
            <div className="h-4 w-4/6 skeleton" />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-4">
              {/* Rating */}
              <div className="h-5 w-20 skeleton" />
              {/* Location */}
              <div className="h-5 w-32 skeleton" />
            </div>
            {/* Button */}
            <div className="h-10 w-32 rounded-lg skeleton" />
          </div>
        </div>
      </div>
    </div>
  )
}
