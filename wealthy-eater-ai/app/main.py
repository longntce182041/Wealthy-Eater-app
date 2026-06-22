import logging
from fastapi import FastAPI, Header, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.config import settings
from app.dto.optimization_dto import OptimizationRequestDTO, OptimizationResponseDTO
from app.services.solver_service import SolverService

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("wealthy_eater_ai_engine")

app = FastAPI(
    title="Wealthy-Eater Optimization Microservice Core",
    version="1.0.0",
    description="Intelligent Linear Programming Solver Engine supporting the Wealthy-Eater nutrition platform."
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"422 Validation Error: {exc.errors()}")
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

@app.get("/health", status_code=status.HTTP_200_OK)
async def system_health_check():
    return {"status": "GREEN_HEALTHY_ONLINE", "engine": "PuLP_CBC_Linear_Programming"}

@app.post("/api/v1/ai/compute-diet", response_model=OptimizationResponseDTO)
async def execute_diet_optimization_matrix(
    payload: OptimizationRequestDTO,
    x_internal_secret: str = Header(..., alias="X-INTERNAL-SECRET")
):
    if x_internal_secret != settings.INTERNAL_SECRET_KEY:
        logger.warning("Unauthorized cross-network connection attempt intercepted.")
        raise HTTPException(status_code=401, detail="Security validation failure: Secret token mismatch.")

    try:
        response_data = SolverService.calculate_macro_distribution(payload)
        return response_data
    except HTTPException:
        raise
    except Exception as ex:
        logger.error(f"Unexpected matrix compilation breakdown event trace: {str(ex)}")
        raise HTTPException(status_code=500, detail=f"Internal Optimization Engine Error: {str(ex)}")

