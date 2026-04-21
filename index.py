from langchain_community.document_loaders import DirectoryLoader, UnstructuredMarkdownLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings

# Cargar todos los .md de la carpeta data/
loader = DirectoryLoader(
    "data/",
    glob="**/*.md",
    loader_cls=UnstructuredMarkdownLoader
)
documents = loader.load()
print(f"Cargados {len(documents)} documentos")

# Dividir en chunks
splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50
)
chunks = splitter.split_documents(documents)
print(f"Divididos en {len(chunks)} chunks")

# Embeddings locales
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

# Guardar en ChromaDB
vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    persist_directory="./chroma_db"
)

print("Base de datos vectorial creada en ./chroma_db")