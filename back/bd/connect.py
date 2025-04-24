import psycopg2

db_obsites = psycopg2.connect(dbname = "demo_obsites", host="localhost", user="postgres", password="postgres", port="5432")