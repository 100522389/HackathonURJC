"""Router para el servicio de Machine Learning basado en historial de pedidos y posición GPS."""
#Añadir cosas que se necesiten o borrar las que no
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import subprocess as ss
import re
import os
import numpy as np
from scipy.spatial import cKDTree as cKDTree22

router = APIRouter()

