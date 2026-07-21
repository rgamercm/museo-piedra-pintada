CREATE TABLE configuracion_sistema (
  clave VARCHAR(50) PRIMARY KEY,
  valor JSONB NOT NULL,
  actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO configuracion_sistema (clave, valor) 
VALUES ('horario_atencion', '{"lunes": "Cerrado", "martes_viernes": "8:00 am - 5:00 pm", "sabado": "8:00 am - 6:00 pm", "domingo": "9:00 am - 4:00 pm", "feriados": "Consultar"}'::jsonb);
