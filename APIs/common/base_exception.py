from typing import Any, Dict, Optional

class BaseException(Exception):
    def __init__(
            self,
            message: str,
            *,
            status:Optional[str],
            code:Optional[int],
            details:Optional[Dict[str, Any]],
            log: True
    ):
        
        super().__init__(message)
        self.message = message
        self.status = status
        self.code = code
        self.details = details or {}


    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.__class__.__name__,
            "message": self.message,
            "status": self.status,
            "code": self.code,
            "details": self.details,
        }