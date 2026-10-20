from .base_exception import BaseException

#--------------------------Database Exceptions------------------------#
class DBConnectionError(BaseException):
    def __init__(self, message = "Unable to initalize database",  details=None):
        super().__init__( message, status=503, code="DB_INIT_ERROR", details=details)

class DBTransactionError(BaseException):
    def __init__(self, message = "Transaction failed",  details=None):
        super().__init__( message, status=503, code="TRANSACTION_ERROR", details=details)

class DBNotFoundError(BaseException):
    def __init__(self, message = "database not found",  details=None):
        super().__init__( message, status=404, code="DB_NOTFOUND_ERROR", details=details)
