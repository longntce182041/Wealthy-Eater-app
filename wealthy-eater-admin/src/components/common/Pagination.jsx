import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ currentPage, totalPages, onPrevPage, onNextPage }) => {
    if (totalPages === 0) return null;

    return (
        <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm">
            <button
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${currentPage === 1 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                onClick={onPrevPage} disabled={currentPage === 1}
            >
                <ChevronLeft size={18} /> Previous
            </button>
            <span className="text-sm font-medium text-slate-500">
                Page <strong className="text-slate-900">{currentPage}</strong> of <strong className="text-slate-900">{totalPages}</strong>
            </span>
            <button
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${currentPage === totalPages ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                onClick={onNextPage} disabled={currentPage === totalPages}
            >
                Next <ChevronRight size={18} />
            </button>
        </div>
    );
};

export default Pagination;
