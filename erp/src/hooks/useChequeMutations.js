import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChequesService } from '@/api/services';
import toast from 'react-hot-toast';

/**
 * Hook for cheque mutations with automatic cache invalidation
 * Ensures balance sheet and related data refresh after cheque operations
 */
export const useChequeMutations = () => {
  const queryClient = useQueryClient();

  // Helper to invalidate all financial-related queries
  const invalidateFinancialData = (accountIds = []) => {
    // Invalidate balance sheet
    queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
    
    // Invalidate trial balance
    queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
    
    // Invalidate account ledger for affected accounts
    accountIds.forEach(accountId => {
      queryClient.invalidateQueries({ 
        queryKey: ['account-ledger', accountId] 
      });
    });
    
    // Invalidate bank accounts list
    queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    
    // Invalidate cash accounts
    queryClient.invalidateQueries({ queryKey: ['cash-accounts'] });
    
    // Invalidate cheques list
    queryClient.invalidateQueries({ queryKey: ['cheques'] });
    
    // Invalidate supplier statements (if supplier payment)
    queryClient.invalidateQueries({ queryKey: ['supplier-statement'] });
    
    // Invalidate dashboard metrics
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
  };

  // Create cheque mutation
  const createCheque = useMutation({
    mutationFn: ChequesService.create,
    onSuccess: (data) => {
      // Extract affected accounts from response
      const affectedAccounts = [
        data.bank_account_id,
        data.debit_account_id
      ].filter(Boolean);
      
      // Invalidate all related caches
      invalidateFinancialData(affectedAccounts);
      
      toast.success(
        data.transaction_type === 'transfer' 
          ? 'Transfer completed successfully' 
          : 'Cheque issued successfully'
      );
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create cheque/transfer');
    }
  });

  // Clear cheque mutation
  const clearCheque = useMutation({
    mutationFn: ({ id }) => ChequesService.clear(id),
    onSuccess: (data, variables) => {
      invalidateFinancialData();
      toast.success('Cheque marked as cleared');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to clear cheque');
    }
  });

  // Void cheque mutation
  const voidCheque = useMutation({
    mutationFn: ({ id }) => ChequesService.void(id),
    onSuccess: (data, variables) => {
      invalidateFinancialData();
      toast.success('Cheque voided successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to void cheque');
    }
  });

  return {
    createCheque,
    clearCheque,
    voidCheque,
    invalidateFinancialData
  };
};

/**
 * Hook for validating cheque accounts before submission
 */
export const useValidateChequeAccounts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bank_account_id, debit_account_id }) =>
      ChequesService.validateAccounts(bank_account_id, debit_account_id),
    onSuccess: (data) => {
      if (!data.is_valid) {
        toast.error(data.error_message || 'Invalid account selection');
      }
    }
  });
};

/**
 * Hook for cheque linkage report (debugging/data verification)
 */
export const useChequeLinkageReport = (filters = {}) => {
  return useQuery({
    queryKey: ['cheque-linkage', filters],
    queryFn: () => ChequesService.getLinkageReport(filters),
    staleTime: 0, // Always fresh for debugging
  });
};
