import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  startIndex: number;
  endIndex: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  startIndex,
  endIndex,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center justify-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="px-3 py-2"
        >
          Previous
        </Button>

        <div className="flex items-center space-x-1">
          {(() => {
            let startPage, endPage;
            
            if (totalPages <= 3) {
              startPage = 1;
              endPage = totalPages;
            } else {
              startPage = Math.max(1, currentPage - 1);
              endPage = Math.min(totalPages, startPage + 2);
              
              if (endPage - startPage < 2) {
                startPage = Math.max(1, endPage - 2);
              }
            }
            
            const pages = [];
            
            if (startPage > 1) {
              pages.push(
                <Button
                  key={1}
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(1)}
                  className="w-10 h-10 p-0"
                >
                  1
                </Button>
              );
              if (startPage > 2) {
                pages.push(
                  <span key="start-dots" className="px-2 text-gray-400">
                    ...
                  </span>
                );
              }
            }
            
            for (let page = startPage; page <= endPage; page++) {
              pages.push(
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(page)}
                  className={`w-10 h-10 p-0 ${
                    currentPage === page
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                      : ""
                  }`}
                >
                  {page}
                </Button>
              );
            }
            
            if (endPage < totalPages) {
              if (endPage < totalPages - 1) {
                pages.push(
                  <span key="end-dots" className="px-2 text-gray-400">
                    ...
                  </span>
                );
              }
              pages.push(
                <Button
                  key={totalPages}
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(totalPages)}
                  className="w-10 h-10 p-0"
                >
                  {totalPages}
                </Button>
              );
            }
            
            return pages;
          })()}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-3 py-2"
        >
          Next
        </Button>
      </div>

      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} fusions
      </div>
    </div>
  );
}