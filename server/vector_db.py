from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import DocArrayInMemorySearch
from pypdf import PdfReader
import io

class VectorDB:
    def __init__(self):
        self.embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
        self.text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        self.vector_store = None

    def add_pdf(self, pdf_file):
        pdf_reader = PdfReader(io.BytesIO(pdf_file))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text()

        documents = self.text_splitter.split_text(text)
        if self.vector_store is None:
            self.vector_store = DocArrayInMemorySearch.from_texts(documents, self.embeddings)
        else:
            self.vector_store.add_texts(documents)

    def search(self, query):
        if self.vector_store is None:
            return "Vector store is not initialized. Please upload a PDF first."

        docs = self.vector_store.similarity_search(query)
        return "\n".join([doc.page_content for doc in docs])

# Make a single instance available
vector_db = VectorDB()
