import csv
import os

def split_csv_to_chunks(input_file, output_prefix, chunk_size=50000):
    # Create output directory if it doesn't exist
    os.makedirs(output_prefix, exist_ok=True)
    
    with open(input_file, 'r', newline='') as csvfile:
        reader = csv.reader(csvfile)
        header = next(reader)  # Read the header

        chunk_count = 1
        row_count = 0
        chunk_rows = []
        for row in reader:
            chunk_rows.append(row)
            row_count += 1
            if row_count >= chunk_size:
                write_chunk(output_prefix, chunk_count, header, chunk_rows)
                chunk_rows = []
                chunk_count += 1
                row_count = 0

        # Write the last chunk if any remaining rows
        if chunk_rows:
            write_chunk(output_prefix, chunk_count, header, chunk_rows)

def write_chunk(output_prefix, chunk_count, header, rows):
    output_file = f"{output_prefix}/output_chunk_{chunk_count}.csv"
    with open(output_file, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(header)
        writer.writerows(rows)

# Example usage
input_file = "../files/data.csv"
output_prefix = "output_chunks"
split_csv_to_chunks(input_file, output_prefix)
