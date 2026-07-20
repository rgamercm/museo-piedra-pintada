import re, json

sql_file = 'D:\\GitHub Proyectos\\museo-piedra-pintada\\db\\seed-petroglifos-real.sql'
with open(sql_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

result = []
for line in lines:
    line = line.strip()
    if line.startswith('(') and (line.endswith('),') or line.endswith(');')):
        # line is like: ('Petroglifo S9R1', 'Roca registrada...', 'Estás frente...', '../assets...', 'S9R1', 'Erosionado', 'S9R1', 10.3, -67.8, 550, '1', '0,5 cm', 'redondeado', 'iluminado', 'al cerro', 'erosión', '3.03.2022', 'notas'),
        
        # We can extract values using a csv reader or just finding quotes
        import csv
        from io import StringIO
        # Remove ( at start and ), or ); at end
        content = line[1:-2]
        reader = csv.reader([content], quotechar="'", skipinitialspace=True)
        try:
            row = next(reader)
            # row[0] = nombre
            # row[1] = descripcion
            # row[3] = imagen_url
            # row[4] = codigo_qr (id)
            # row[5] = categoria
            # row[9] = altitud
            # row[14] = orientacion
            
            obj = {
                'id': row[4],
                'nombre': row[4],
                'imagen_url': row[3],
                'estacion_nombre': (row[9] + ' m.s.n.m') if (row[9] and row[9] != 'NULL') else 'Sin altitud',
                'categoria': row[14] if (len(row) > 14 and row[14] != 'NULL') else 'Grabado',
                'descripcion': row[1]
            }
            result.append(obj)
        except Exception as e:
            print("Error parsing line:", line, e)

json_str = json.dumps(result, ensure_ascii=False, indent=2)
with open('D:\\GitHub Proyectos\\museo-piedra-pintada\\frontend\\js\\mock-data.js', 'w', encoding='utf-8') as f:
    f.write('window.MOCK_PETROGLIFOS = ' + json_str + ';\n')
print('Successfully generated mock-data.js with {} items'.format(len(result)))
