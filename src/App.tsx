import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  Plus,
  Trash2,
  Save,
  FileText,
  Users,
  Edit,
  BarChart2,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import * as XLSX from "xlsx"; // For XLSX file parsing

// Replace with your deployed Google Apps Script Web App URL
const scriptURL =
  "https://script.google.com/macros/s/AKfycbyRnBKNf2C8SCwN0bzHAJDbtt1hIiO0w7kPnKqXPHgSkRper3eKT2ZBLUhQGCMRBpC_/exec";

interface QuizQuestion {
  id: string;
  soal: string;
  gambar: string;
  opsiA: string;
  opsiB: string;
  opsiC: string;
  opsiD: string;
  jawaban: string;
}

interface Student {
  id: string;
  nisn: string;
  nama_siswa: string;
}

interface ExamResult {
  id?: string;
  status: string;
  nama: string;
  mata_pelajaran: string;
  bab_nama: string;
  nilai: number;
  persentase: number;
  timestamp: string;
  jenis_ujian: string;
  file_ujian: string;
  soal_1: string;
  soal_2: string;
  soal_3: string;
  soal_4: string;
  soal_5: string;
  soal_6: string;
  soal_7: string;
  soal_8: string;
  soal_9: string;
  soal_10: string;
  soal_11: string;
  soal_12: string;
  soal_13: string;
  soal_14: string;
  soal_15: string;
  soal_16: string;
  soal_17: string;
  soal_18: string;
  soal_19: string;
  soal_20: string;
}

interface MapelData {
  mapel: string;
  materi: string;
  sheetName: string;
}

interface MapelItem {
  id: string;
  mapel: string;
  materi: string;
  sheetName: string;
  status: string;
}

const QuizMaker: React.FC = () => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<string>("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [mapelData, setMapelData] = useState<MapelData[]>([]);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetch(`${scriptURL}?action=getMapelData`, {
      method: "GET",
      mode: "cors",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setMapelData(data.data);
          const uniqueSubjects = Array.from(
            new Set(data.data.map((item: MapelData) => item.mapel))
          ) as string[];
          setSubjects(uniqueSubjects);
        } else {
          setSubmitStatus("❌ Gagal mengambil data mapel.");
          console.error("Error fetching mapel data:", data.message);
        }
      })
      .catch((error) => {
        setSubmitStatus("❌ Gagal mengambil data mapel.");
        console.error("Fetch error:", error);
      });
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      const filteredTopics = mapelData
        .filter((item) => item.mapel === selectedSubject)
        .map((item) => item.materi);
      setTopics(filteredTopics);
      setSelectedTopic("");
      setSelectedSheet("");
      setQuestions([]);
      setFile(null);
    } else {
      setTopics([]);
      setSelectedTopic("");
      setSelectedSheet("");
      setQuestions([]);
      setFile(null);
    }
  }, [selectedSubject, mapelData]);

  useEffect(() => {
    if (!selectedSubject || !selectedTopic || !mapelData.length) {
      console.warn("Skipping fetch: missing required data", {
        selectedSubject,
        selectedTopic,
        mapelData,
      });
      setQuestions([]);
      setSelectedSheet("");
      return;
    }
    const mapelEntry = mapelData.find(
      (item) => item.mapel === selectedSubject && item.materi === selectedTopic
    );
    if (!mapelEntry) {
      console.warn("No matching mapel entry found", {
        selectedSubject,
        selectedTopic,
      });
      setQuestions([]);
      setSelectedSheet("");
      return;
    }
    setSelectedSheet(mapelEntry.sheetName);
    console.log("Fetching questions with:", { selectedSubject, selectedTopic });
    fetch(
      `${scriptURL}?action=getQuestions&mapel=${encodeURIComponent(
        selectedSubject
      )}&materi=${encodeURIComponent(selectedTopic)}`,
      {
        method: "GET",
        mode: "cors",
      }
    )
      .then((response) => response.json())
      .then((data) => {
        console.log("Response from getQuestions:", data);
        if (data.success && Array.isArray(data.data)) {
          const formattedQuestions = data.data.map((q: any) => ({
            id: q.id || "",
            soal: q.question || "",
            gambar: q.imageUrl || "",
            opsiA: q.options?.[0] || "",
            opsiB: q.options?.[1] || "",
            opsiC: q.options?.[2] || "",
            opsiD: q.options?.[3] || "",
            jawaban: q.answer || "A",
          }));
          setQuestions(formattedQuestions);
        } else {
          setSubmitStatus(`❌ Gagal mengambil data soal: ${data.message}`);
          console.error("Error fetching questions:", data.message);
        }
      })
      .catch((error) => {
        setSubmitStatus(`❌ Gagal mengambil data soal.`);
        console.error("Fetch error:", error);
      });
  }, [selectedSubject, selectedTopic, mapelData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedSubject || !selectedTopic) {
        setSubmitStatus("⚠️ Pilih mata pelajaran dan materi terlebih dahulu!");
        e.target.value = "";
        return;
      }
      setFile(selectedFile);
      setSubmitStatus("📂 File dipilih, siap untuk diunggah.");
    }
  };

  const handleFileUpload = () => {
    if (!file || !selectedSubject || !selectedTopic) {
      setSubmitStatus(
        "⚠️ Pilih file dan pastikan mata pelajaran serta materi sudah dipilih!"
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("📤 Mengunggah dan memproses file...");

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          defval: "",
        }) as any[]; // Tambahkan { defval: "" } di sini

        if (jsonData.length === 0) {
          throw new Error("File XLSX kosong.");
        }

        const expectedHeaders = [
          "SOAL",
          "GAMBAR",
          "OPSI A",
          "OPSI B",
          "OPSI C",
          "OPSI D",
          "JAWABAN",
        ];
        const headers = Object.keys(jsonData[0] || {});
        const isValidFormat = expectedHeaders.every((header) =>
          headers.includes(header)
        );

        if (!isValidFormat) {
          throw new Error(
            "Format file tidak sesuai. Pastikan header kolom: SOAL, GAMBAR, OPSI A, OPSI B, OPSI C, OPSI D, JAWABAN ada di file."
          );
        }

        const formattedQuestions: QuizQuestion[] = jsonData.map(
          (row, index) => {
            const jawaban = String(row["JAWABAN"]).toUpperCase();
            if (!["A", "B", "C", "D"].includes(jawaban)) {
              throw new Error(
                `Jawaban tidak valid pada baris ${
                  index + 2
                }. Harus A, B, C, atau D.`
              );
            }
            if (
              !row["SOAL"] ||
              !row["OPSI A"] ||
              !row["OPSI B"] ||
              !row["OPSI C"] ||
              !row["OPSI D"]
            ) {
              throw new Error(
                `Ada field wajib kosong pada baris ${index + 2}.`
              );
            }
            return {
              id: String(index + 1),
              soal: String(row["SOAL"]).trim(),
              gambar: String(row["GAMBAR"]).trim(), // Aman meskipun kosong
              opsiA: String(row["OPSI A"]).trim(),
              opsiB: String(row["OPSI B"]).trim(),
              opsiC: String(row["OPSI C"]).trim(),
              opsiD: String(row["OPSI D"]).trim(),
              jawaban: jawaban,
            };
          }
        );

        setQuestions(formattedQuestions);

        fetch(scriptURL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "replaceQuestions",
            mapel: selectedSubject,
            materi: selectedTopic,
            data: formattedQuestions.map((q) => ({
              soal: q.soal,
              gambar: q.gambar,
              opsiA: q.opsiA,
              opsiB: q.opsiB,
              opsiC: q.opsiC,
              opsiD: q.opsiD,
              jawaban: q.jawaban,
            })),
          }),
        })
          .then(() => {
            setSubmitStatus(
              `✅ Data dari file berhasil diunggah dan menggantikan data di ${selectedSheet}!`
            );
            setFile(null);
            const fileInput = document.querySelector(
              'input[type="file"]'
            ) as HTMLInputElement;
            if (fileInput) fileInput.value = "";
            setIsSubmitting(false);
          })
          .catch((error) => {
            setSubmitStatus(`❌ Gagal mengunggah data: ${error.message}`);
            console.error("Fetch error:", error);
            setIsSubmitting(false);
          });
      } catch (error: any) {
        setSubmitStatus(`❌ Gagal memproses file: ${error.message}`);
        console.error("File processing error:", error);
        setIsSubmitting(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const addQuestion = () => {
    if (!selectedSubject || !selectedTopic) {
      setSubmitStatus("⚠️ Pilih mata pelajaran dan materi terlebih dahulu!");
      return;
    }
    setQuestions([
      ...questions,
      {
        id: String(questions.length + 1),
        soal: "",
        gambar: "",
        opsiA: "",
        opsiB: "",
        opsiC: "",
        opsiD: "",
        jawaban: "A",
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      const questionToDelete = questions[index];
      fetch(scriptURL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteQuestion",
          mapel: selectedSubject,
          materi: selectedTopic,
          id: questionToDelete.id,
        }),
      })
        .then(() => {
          setQuestions(questions.filter((_, i) => i !== index));
          setSubmitStatus("✅ Soal berhasil dihapus!");
        })
        .catch((error) => {
          setSubmitStatus(`❌ Gagal menghapus soal: ${error.message}`);
          console.error("Fetch error:", error);
        });
    }
  };

  const updateQuestion = (
    index: number,
    field: keyof QuizQuestion,
    value: string
  ) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setQuestions(updatedQuestions);
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
  };

  const saveEditedQuestion = (index: number) => {
    const questionToSave = questions[index];
    if (!questionToSave || !selectedSubject || !selectedTopic) return;

    // Pastikan semua nilai adalah string sebelum memanggil .trim()
    const soal = String(questionToSave.soal || "").trim();
    const opsiA = String(questionToSave.opsiA || "").trim();
    const opsiB = String(questionToSave.opsiB || "").trim();
    const opsiC = String(questionToSave.opsiC || "").trim();
    const opsiD = String(questionToSave.opsiD || "").trim();
    const jawaban = String(questionToSave.jawaban || "").trim();

    if (!soal || !opsiA || !opsiB || !opsiC || !opsiD || !jawaban) {
      setSubmitStatus("⚠️ Semua field wajib diisi!");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("Mengirim perubahan...");

    fetch(scriptURL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "editQuestion",
        mapel: selectedSubject,
        materi: selectedTopic,
        id: questionToSave.id,
        soal: soal,
        gambar: String(questionToSave.gambar || "").trim(),
        opsiA: opsiA,
        opsiB: opsiB,
        opsiC: opsiC,
        opsiD: opsiD,
        jawaban: jawaban,
      }),
    })
      .then(() => {
        setSubmitStatus("✅ Soal berhasil diperbarui!");
        setEditingIndex(null);
        setIsSubmitting(false);
      })
      .catch((error) => {
        setSubmitStatus(`❌ Gagal memperbarui soal: ${error.message}`);
        console.error("Fetch error:", error);
        setIsSubmitting(false);
      });
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    if (selectedSubject && selectedTopic) {
      fetch(
        `${scriptURL}?action=getQuestions&mapel=${encodeURIComponent(
          selectedSubject
        )}&materi=${encodeURIComponent(selectedTopic)}`,
        {
          method: "GET",
          mode: "cors",
        }
      )
        .then((response) => response.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data)) {
            const formattedQuestions = data.data.map((q: any) => ({
              id: q.id || "",
              soal: q.question || "",
              gambar: q.imageUrl || "",
              opsiA: q.options?.[0] || "",
              opsiB: q.options?.[1] || "",
              opsiC: q.options?.[2] || "",
              opsiD: q.options?.[3] || "",
              jawaban: q.answer || "A",
            }));
            setQuestions(formattedQuestions);
          }
        })
        .catch((error) => console.error("Error reloading questions:", error));
    }
  };

  const handleSubmit = () => {
    if (!selectedSubject || !selectedTopic) {
      setSubmitStatus("⚠️ Pilih mata pelajaran dan materi terlebih dahulu!");
      return;
    }

    const hasEmptyFields = questions.some((q) => {
      const soal = String(q.soal || "").trim();
      const opsiA = String(q.opsiA || "").trim();
      const opsiB = String(q.opsiB || "").trim();
      const opsiC = String(q.opsiC || "").trim();
      const opsiD = String(q.opsiD || "").trim();
      const jawaban = String(q.jawaban || "").trim();

      return !soal || !opsiA || !opsiB || !opsiC || !opsiD || !jawaban;
    });
    if (hasEmptyFields) {
      setSubmitStatus("⚠️ Semua field wajib diisi!");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("Mengirim data...");

    const dataToSend = questions.map((q) => ({
      soal: q.soal,
      gambar: q.gambar,
      opsiA: q.opsiA,
      opsiB: q.opsiB,
      opsiC: q.opsiC,
      opsiD: q.opsiD,
      jawaban: q.jawaban,
    }));

    fetch(scriptURL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "addToSheet",
        mapel: selectedSubject,
        materi: selectedTopic,
        data: dataToSend,
      }),
    })
      .then(() => {
        setSubmitStatus(`✅ Data berhasil dikirim ke ${selectedSheet}!`);
        setIsSubmitting(false);
      })
      .catch((error) => {
        setSubmitStatus(`❌ Gagal mengirim data: ${error.message}`);
        console.error("Fetch error:", error);
        setIsSubmitting(false);
      });
  };

  const downloadTemplate = () => {
    // Define the headers for the template
    const headers = [
      "SOAL",
      "GAMBAR",
      "OPSI A",
      "OPSI B",
      "OPSI C",
      "OPSI D",
      "JAWABAN",
    ];

    // Create an empty worksheet with just headers
    const ws = XLSX.utils.json_to_sheet([], { header: headers });

    // Create a new workbook and append the worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Soal");

    // Generate the file and trigger download
    XLSX.writeFile(wb, "Template_Soal_Quiz.xlsx");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="text-blue-600" size={32} />
            <h1 className="text-3xl font-bold text-gray-800">
              Pembuat Soal Online
            </h1>
          </div>

          <p className="text-gray-600 mb-6">
            Pilih mata pelajaran dan materi, lalu buat soal pilihan ganda,
            unggah file XLSX, atau kirim langsung ke sheet yang sesuai di Google
            Sheets Anda.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mata Pelajaran
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Pilih Mata Pelajaran</option>
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Materi
              </label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!selectedSubject}
              >
                <option value="">Pilih Materi</option>
                {topics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <input
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={!selectedSheet}
            />
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto mb-2 sm:mb-0"
              title="Unduh template Excel untuk import soal"
            >
              <FileText size={20} />
              Unduh Template
            </button>
            <button
              onClick={handleFileUpload}
              disabled={!file || isSubmitting || !selectedSheet}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 w-full sm:w-auto"
            >
              <Plus size={20} />
              {isSubmitting ? "Mengunggah..." : "Unggah dan Ganti Soal"}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            File harus dalam format XLSX dengan kolom: SOAL, GAMBAR, OPSI A,
            OPSI B, OPSI C, OPSI D, JAWABAN.
          </p>

          {submitStatus && (
            <div
              className={`p-4 rounded-lg mb-6 ${
                submitStatus.includes("berhasil") ||
                submitStatus.includes("diperbarui") ||
                submitStatus.includes("diunggah") ||
                submitStatus.includes("dihapus")
                  ? "bg-green-100 text-green-700 border border-green-200"
                  : submitStatus.includes("Mengirim") ||
                    submitStatus.includes("Mengunggah")
                  ? "bg-blue-100 text-blue-700 border border-blue-200"
                  : "bg-red-100 text-red-700 border border-red-200"
              }`}
            >
              {submitStatus}
            </div>
          )}

          {selectedSheet && (
            <div className="space-y-6">
              {questions.map((question, index) => (
                <div
                  key={question.id || index}
                  className="border border-gray-200 rounded-lg p-6 bg-gray-50"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Soal {index + 1}
                    </h3>
                    <div className="space-x-2">
                      {questions.length > 1 && (
                        <button
                          onClick={() => removeQuestion(index)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                      <button
                        onClick={() => startEditing(index)}
                        className="text-blue-500 hover:text-blue-700 transition-colors"
                      >
                        <Edit size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pertanyaan
                      </label>
                      <textarea
                        value={question.soal}
                        onChange={(e) =>
                          updateQuestion(index, "soal", e.target.value)
                        }
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Masukkan pertanyaan soal..."
                        disabled={editingIndex !== index}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gambar (URL - opsional)
                      </label>
                      <input
                        type="url"
                        value={question.gambar}
                        onChange={(e) =>
                          updateQuestion(index, "gambar", e.target.value)
                        }
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://example.com/gambar.jpg"
                        disabled={editingIndex !== index}
                      />
                      {question.gambar && (
                        <div className="mt-2">
                          <img
                            src={question.gambar}
                            alt="Preview Gambar"
                            className="max-w-full h-auto mt-2 rounded-lg shadow-md"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src =
                                "https://via.placeholder.com/300?text=Gambar+tidak+ditemukan";
                              target.alt = "Gambar tidak valid";
                            }}
                            style={{ maxHeight: "200px" }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {["opsiA", "opsiB", "opsiC", "opsiD"].map((option, i) => (
                        <div key={option}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Opsi {String.fromCharCode(65 + i)}
                          </label>
                          <input
                            type="text"
                            value={question[option as keyof QuizQuestion]}
                            onChange={(e) =>
                              updateQuestion(
                                index,
                                option as keyof QuizQuestion,
                                e.target.value
                              )
                            }
                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder={`Pilihan ${String.fromCharCode(
                              65 + i
                            )}`}
                            disabled={editingIndex !== index}
                          />
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Jawaban Benar
                      </label>
                      <select
                        value={question.jawaban}
                        onChange={(e) =>
                          updateQuestion(index, "jawaban", e.target.value)
                        }
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={editingIndex !== index}
                      >
                        {["A", "B", "C", "D"].map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    {editingIndex === index && (
                      <div className="flex gap-4 mt-4">
                        <button
                          onClick={() => saveEditedQuestion(index)}
                          disabled={isSubmitting}
                          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          <Save size={20} />
                          {isSubmitting ? "Menyimpan..." : "Simpan"}
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          Batal
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-4 mt-8">
            <button
              onClick={addQuestion}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={!selectedSheet}
            >
              <Plus size={20} />
              Tambah Soal
            </button>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedSheet}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Save size={20} />
              {isSubmitting ? "Mengirim..." : "Kirim ke Sheet"}
            </button>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">
              Catatan Implementasi:
            </h4>
            <p className="text-sm text-yellow-700">
              Untuk mengirim data ke Google Sheets, pastikan:
            </p>
            <ol className="text-sm text-yellow-700 mt-2 ml-4 list-decimal space-y-1">
              <li>Google Apps Script sudah terhubung ke spreadsheet Anda.</li>
              <li>URL script sudah benar dan di-deploy sebagai web app.</li>
              <li>Script memiliki izin untuk menulis ke sheet yang sesuai.</li>
              <li>
                Script mendukung parameter `mapel` dan `materi` untuk menentukan
                nama sheet dan aksi `replaceQuestions` untuk menggantikan data.
              </li>
              <li>
                DataMapel sheet memiliki kolom MAPEL, MATERI, dan Nama Sheet.
              </li>
              <li>
                File XLSX memiliki kolom: SOAL, GAMBAR, OPSI A, OPSI B, OPSI C,
                OPSI D, JAWABAN.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

const StudentData: React.FC = () => {
  const [nisn, setNisn] = useState<string>("");
  const [namaSiswa, setNamaSiswa] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editNisn, setEditNisn] = useState<string>("");
  const [editNamaSiswa, setEditNamaSiswa] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchStudents = () => {
    console.log("Fetching students from DataSiswa...");
    setIsLoading(true);

    fetch(`${scriptURL}?action=getFromDataSiswa`, {
      method: "GET",
      mode: "cors",
    })
      .then((response) => {
        console.log("Response status:", response.status);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Response data from getFromDataSiswa:", data);

        // Handle different possible response formats
        if (data.status === "success" && Array.isArray(data.data)) {
          setStudents(data.data);
          setSubmitStatus(
            `✅ Berhasil mengambil ${data.data.length} data siswa.`
          );
        } else if (data.success === true && Array.isArray(data.data)) {
          setStudents(data.data);
          setSubmitStatus(
            `✅ Berhasil mengambil ${data.data.length} data siswa.`
          );
        } else if (Array.isArray(data)) {
          setStudents(data);
          setSubmitStatus(`✅ Berhasil mengambil ${data.length} data siswa.`);
        } else {
          setSubmitStatus("❌ Format response tidak sesuai dari DataSiswa.");
          console.error("Unexpected response format:", data);
          setStudents([]);
        }
        setIsLoading(false);
      })
      .catch((error) => {
        setSubmitStatus(`❌ Gagal mengambil data siswa: ${error.message}`);
        console.error("Fetch error:", error);
        setStudents([]);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleSubmit = () => {
    if (!nisn.trim() || !namaSiswa.trim()) {
      setSubmitStatus("⚠️ Semua field wajib diisi!");
      return;
    }

    // Check for duplicate NISN
    const existingStudent = students.find(
      (student) => student.nisn === nisn.trim()
    );
    if (existingStudent) {
      setSubmitStatus("⚠️ NISN sudah ada! Gunakan NISN yang berbeda.");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("Mengirim data...");

    const requestData = {
      action: "addToDataSiswa",
      data: [{ nisn: nisn.trim(), nama_siswa: namaSiswa.trim() }],
    };

    console.log("Sending data:", requestData);

    fetch(scriptURL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    })
      .then(() => {
        setSubmitStatus("✅ Siswa berhasil ditambahkan ke DataSiswa!");
        setNisn("");
        setNamaSiswa("");
        // Wait a bit before refetching to allow server to process
        setTimeout(() => {
          fetchStudents();
        }, 1000);
        setIsSubmitting(false);
      })
      .catch((error) => {
        setSubmitStatus(`❌ Gagal menambahkan siswa: ${error.message}`);
        console.error("Fetch error:", error);
        setIsSubmitting(false);
      });
  };

  const deleteAllStudents = () => {
    if (!confirm("Apakah Anda yakin ingin menghapus semua data siswa?")) return;

    setIsSubmitting(true);
    setSubmitStatus("Menghapus semua data siswa...");

    fetch(scriptURL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "deleteAllStudents",
      }),
    })
      .then(() => {
        setSubmitStatus("✅ Semua data siswa di DataSiswa berhasil dihapus!");
        setStudents([]);
        setIsSubmitting(false);
      })
      .catch((error) => {
        setSubmitStatus(`❌ Gagal menghapus data siswa: ${error.message}`);
        console.error("Fetch error:", error);
        setIsSubmitting(false);
      });
  };

  const startEditingStudent = (student: Student) => {
    setEditingStudentId(student.id);
    setEditNisn(student.nisn);
    setEditNamaSiswa(student.nama_siswa);
    setSubmitStatus(""); // Clear any previous status
  };

  const saveEditedStudent = (id: string) => {
    if (!editNisn.trim() || !editNamaSiswa.trim()) {
      setSubmitStatus("⚠️ Semua field wajib diisi!");
      return;
    }

    // Check for duplicate NISN (excluding current student)
    const existingStudent = students.find(
      (student) => student.nisn === editNisn.trim() && student.id !== id
    );
    if (existingStudent) {
      setSubmitStatus("⚠️ NISN sudah ada! Gunakan NISN yang berbeda.");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("Menyimpan perubahan...");

    const requestData = {
      action: "editStudent",
      id,
      nisn: editNisn.trim(),
      nama_siswa: editNamaSiswa.trim(),
    };

    console.log("Editing student data:", requestData);

    fetch(scriptURL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    })
      .then(() => {
        setSubmitStatus("✅ Data siswa berhasil diperbarui!");
        setEditingStudentId(null);
        setEditNisn("");
        setEditNamaSiswa("");
        // Wait a bit before refetching to allow server to process
        setTimeout(() => {
          fetchStudents();
        }, 1000);
        setIsSubmitting(false);
      })
      .catch((error) => {
        setSubmitStatus(`❌ Gagal memperbarui data siswa: ${error.message}`);
        console.error("Fetch error:", error);
        setIsSubmitting(false);
      });
  };

  const cancelEditingStudent = () => {
    setEditingStudentId(null);
    setEditNisn("");
    setEditNamaSiswa("");
    setSubmitStatus(""); // Clear any previous status
  };

  const deleteStudent = (student: Student) => {
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus siswa "${student.nama_siswa}" (NISN: ${student.nisn})?`
      )
    )
      return;

    setIsSubmitting(true);
    setSubmitStatus(`Menghapus siswa ${student.nama_siswa}...`);

    const requestData = {
      action: "deleteStudent",
      id: student.id,
    };

    console.log("Deleting student:", requestData);

    fetch(scriptURL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    })
      .then(() => {
        setSubmitStatus(`✅ Siswa ${student.nama_siswa} berhasil dihapus!`);
        // Wait a bit before refetching to allow server to process
        setTimeout(() => {
          fetchStudents();
        }, 1000);
        setIsSubmitting(false);
      })
      .catch((error) => {
        setSubmitStatus(
          `❌ Gagal menghapus siswa ${student.nama_siswa}: ${error.message}`
        );
        console.error("Delete error:", error);
        setIsSubmitting(false);
      });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Users className="text-blue-600" size={32} />
            <h1 className="text-3xl font-bold text-gray-800">Data Siswa</h1>
          </div>

          <p className="text-gray-600 mb-6">
            Tambah atau edit data siswa dan lihat daftar siswa yang sudah
            terinput di DataSiswa.
          </p>

          {submitStatus && (
            <div
              className={`p-4 rounded-lg mb-6 ${
                submitStatus.includes("berhasil") || submitStatus.includes("✅")
                  ? "bg-green-100 text-green-700 border border-green-200"
                  : submitStatus.includes("Mengirim") ||
                    submitStatus.includes("Menghapus") ||
                    submitStatus.includes("Menyimpan")
                  ? "bg-blue-100 text-blue-700 border border-blue-200"
                  : "bg-red-100 text-red-700 border border-red-200"
              }`}
            >
              {submitStatus}
            </div>
          )}

          <div className="grid gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NISN
              </label>
              <input
                type="text"
                value={nisn}
                onChange={(e) => setNisn(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Masukkan NISN"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Siswa
              </label>
              <input
                type="text"
                value={namaSiswa}
                onChange={(e) => setNamaSiswa(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Masukkan nama siswa"
                disabled={isSubmitting}
              />
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Save size={20} />
                {isSubmitting ? "Mengirim..." : "Tambah Siswa"}
              </button>
              <button
                onClick={deleteAllStudents}
                disabled={isSubmitting || students.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Trash2 size={20} />
                {isSubmitting ? "Menghapus..." : "Hapus Semua Siswa"}
              </button>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Daftar Siswa ({students.length} siswa)
            </h3>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Memuat data siswa...</p>
              </div>
            ) : students.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        NISN
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Nama Siswa
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr
                        key={
                          student.id || `${student.nisn}-${student.nama_siswa}`
                        }
                        className="border-t"
                      >
                        {editingStudentId === student.id ? (
                          <>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              <input
                                type="text"
                                value={editNisn}
                                onChange={(e) => setEditNisn(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Masukkan NISN"
                                disabled={isSubmitting}
                              />
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              <input
                                type="text"
                                value={editNamaSiswa}
                                onChange={(e) =>
                                  setEditNamaSiswa(e.target.value)
                                }
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Masukkan nama siswa"
                                disabled={isSubmitting}
                              />
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveEditedStudent(student.id)}
                                  disabled={isSubmitting}
                                  className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                  <Save size={16} />
                                  {isSubmitting ? "Menyimpan..." : "Simpan"}
                                </button>
                                <button
                                  onClick={cancelEditingStudent}
                                  disabled={isSubmitting}
                                  className="flex items-center gap-1 px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                  Batal
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {student.nisn}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {student.nama_siswa}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => startEditingStudent(student)}
                                  disabled={isSubmitting}
                                  className="text-blue-500 hover:text-blue-700 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
                                  title="Edit siswa"
                                >
                                  <Edit size={18} />
                                </button>
                                <button
                                  onClick={() => deleteStudent(student)}
                                  disabled={isSubmitting}
                                  className="text-red-500 hover:text-red-700 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
                                  title="Hapus siswa"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">Belum ada data siswa.</p>
                <p className="text-sm text-gray-500 mt-2">
                  Tambah siswa baru menggunakan form di atas.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ExamResults: React.FC = () => {
  const [sortOrder, setSortOrder] = useState<"highest" | "lowest" | "">("");
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [mapelFromSheet, setMapelFromSheet] = useState<string[]>([]);
  const [students, setStudents] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [chapters, setChapters] = useState<string[]>([]);
  const [examTypes, setExamTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [nameFilter, setNameFilter] = useState<string>("");
  const [subjectFilter, setSubjectFilter] = useState<string>("");
  const [chapterFilter, setChapterFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [examTypeFilter, setExamTypeFilter] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<string>("");
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "loading" | "";
    message: string;
    show: boolean;
  }>({
    type: "",
    message: "",
    show: false,
  });

  // Function to format ISO date to DD/MM/YYYY
  const formatDate = (isoDate: string): string => {
    if (!isoDate) return "";
    try {
      const date = new Date(isoDate);
      return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (e) {
      console.error("Error formatting date:", e);
      return isoDate;
    }
  };

  // Extract unique values for dropdowns from exam results
  const updateFiltersFromResults = (results: ExamResult[]) => {
    const uniqueStudents = Array.from(
      new Set(results.map((result) => result.nama).filter((nama) => nama))
    ).sort();

    const uniqueSubjects = Array.from(
      new Set(
        results.map((result) => result.mata_pelajaran).filter((mapel) => mapel)
      )
    ).sort();

    const uniqueChapters = Array.from(
      new Set(results.map((result) => result.bab_nama).filter((bab) => bab))
    ).sort();

    const uniqueExamTypes = Array.from(
      new Set(
        results.map((result) => result.jenis_ujian).filter((jenis) => jenis)
      )
    ).sort();

    setStudents(uniqueStudents);
    setSubjects(uniqueSubjects);
    setChapters(uniqueChapters);
    setExamTypes(uniqueExamTypes);
  };

  const fetchMapelFromSheet = () => {
    fetch(`${scriptURL}?action=getMapelData`, {
      method: "GET",
      mode: "cors",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          const uniqueMapel = Array.from(
            new Set(
              data.data
                .map((item: any) => item.mapel)
                .filter(
                  (mapel: any): mapel is string =>
                    typeof mapel === "string" && mapel.trim() !== ""
                )
            )
          ).sort();
          setMapelFromSheet(uniqueMapel as string[]); // <-- TYPE ASSERTION DITAMBAHKAN DI SINI
        } else {
          console.error("Error fetching mapel data for filter:", data.message);
          setMapelFromSheet([]);
        }
      })
      .catch((error) => {
        console.error("Fetch error for mapel data:", error);
        setMapelFromSheet([]);
      });
  };

  // Fetch exam results
  const fetchExamResults = () => {
    fetch(`${scriptURL}?action=getExamResults`, {
      method: "GET",
      mode: "cors",
    })
      .then((response) => response.json())
      .then((data: { success: boolean; data: any[]; message?: string }) => {
        console.log("Response from getExamResults:", data);
        if (data.success && Array.isArray(data.data)) {
          const formattedResults: ExamResult[] = data.data.map(
            (result: ExamResult & { id?: string }) => ({
              id: result.id || String(Math.random()), // TAMBAHKAN INI
              nama: result.nama || "",
              mata_pelajaran: result.mata_pelajaran || "",
              bab_nama: result.bab_nama || "",
              nilai: Number(result.nilai) || 0,
              status: result.status || "",
              persentase: Number(result.persentase) || 0,
              timestamp: result.timestamp || "",
              jenis_ujian: result.jenis_ujian || "",
              file_ujian: String(result.file_ujian || ""),
              soal_1: String(result.soal_1 || ""),
              soal_2: String(result.soal_2 || ""),
              soal_3: String(result.soal_3 || ""),
              soal_4: String(result.soal_4 || ""),
              soal_5: String(result.soal_5 || ""),
              soal_6: String(result.soal_6 || ""),
              soal_7: String(result.soal_7 || ""),
              soal_8: String(result.soal_8 || ""),
              soal_9: String(result.soal_9 || ""),
              soal_10: String(result.soal_10 || ""),
              soal_11: String(result.soal_11 || ""),
              soal_12: String(result.soal_12 || ""),
              soal_13: String(result.soal_13 || ""),
              soal_14: String(result.soal_14 || ""),
              soal_15: String(result.soal_15 || ""),
              soal_16: String(result.soal_16 || ""),
              soal_17: String(result.soal_17 || ""),
              soal_18: String(result.soal_18 || ""),
              soal_19: String(result.soal_19 || ""),
              soal_20: String(result.soal_20 || ""),
            })
          );
          console.log("Formatted exam results:", formattedResults);

          if (
            JSON.stringify(formattedResults) !== JSON.stringify(examResults)
          ) {
            setExamResults(formattedResults);
            // Update filter options based on exam results data
            updateFiltersFromResults(formattedResults);
          }
        } else {
          setError("❌ Gagal mengambil data hasil ujian dari HasilUjian.");
          console.error("Error fetching exam results:", data.message);
        }
        setIsLoading(false);
      })
      .catch((error) => {
        setError("❌ Gagal mengambil data hasil ujian dari HasilUjian.");
        console.error("Fetch error:", error);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchExamResults();
    fetchMapelFromSheet();

    const intervalId = setInterval(fetchExamResults, 10000);
    return () => clearInterval(intervalId);
  }, []);

  // Filter the exam results based on dropdown selections
  const filteredResults = React.useMemo(() => {
    // Apply filters first
    let results = examResults.filter(
      (result) =>
        (!nameFilter || result.nama === nameFilter) &&
        (!subjectFilter || result.mata_pelajaran === subjectFilter) &&
        (!chapterFilter || result.bab_nama === chapterFilter) &&
        (!statusFilter || result.status === statusFilter) &&
        (!examTypeFilter || result.jenis_ujian === examTypeFilter)
    );

    // Apply sorting based on 'Peringkat' dropdown
    if (sortOrder === "highest") {
      // Sort from highest to lowest
      // If scores are equal, sort by timestamp (oldest first)
      results.sort((a, b) => {
        if (b.nilai === a.nilai) {
          // Convert timestamp strings to Date objects for comparison
          // Older timestamp (smaller date) comes first
          return (
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        }
        return b.nilai - a.nilai;
      });
    } else if (sortOrder === "lowest") {
      // Sort from lowest to highest
      // If scores are equal, sort by timestamp (oldest first)
      results.sort((a, b) => {
        if (a.nilai === b.nilai) {
          // Convert timestamp strings to Date objects for comparison
          // Older timestamp (smaller date) comes first
          return (
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        }
        return a.nilai - b.nilai;
      });
    }
    // If sortOrder is "", no specific sorting is applied (keep original order)

    return results;
  }, [
    examResults,
    nameFilter,
    subjectFilter,
    chapterFilter,
    statusFilter,
    examTypeFilter,
    sortOrder,
  ]);

  // TAMBAHKAN FUNGSI closeNotification DI SINI
  const closeNotification = () => {
    setNotification({ type: "", message: "", show: false });
  };

  const deleteExamResult = (examId: string, examData: ExamResult) => {
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus hasil ujian "${examData.nama}" - ${examData.mata_pelajaran} (${examData.bab_nama})?`
      )
    )
      return;

    setIsDeleting(examId);

    // Set loading notification
    setNotification({
      type: "loading",
      message: `Menghapus hasil ujian ${examData.nama}...`,
      show: true,
    });

    const requestData = {
      action: "deleteExamResult",
      id: examId,
    };

    console.log("Deleting exam result:", requestData);

    fetch(scriptURL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    })
      .then(() => {
        // Set success notification
        setNotification({
          type: "success",
          message: `Hasil ujian ${examData.nama} - ${examData.mata_pelajaran} berhasil dihapus!`,
          show: true,
        });

        // Auto hide notification after 3 seconds
        setTimeout(() => {
          setNotification({ type: "", message: "", show: false });
        }, 3000);

        // Refresh data after 1 second
        setTimeout(() => {
          fetchExamResults();
        }, 1000);

        setIsDeleting(null);
      })
      .catch((error) => {
        // Set error notification
        setNotification({
          type: "error",
          message: `Gagal menghapus hasil ujian ${examData.nama}: ${error.message}`,
          show: true,
        });

        // Auto hide notification after 5 seconds
        setTimeout(() => {
          setNotification({ type: "", message: "", show: false });
        }, 5000);

        console.error("Delete error:", error);
        setIsDeleting(null);
      });
  };

  const downloadPDF = (result: ExamResult, index: number) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.text("Hasil Ujian Siswa", 14, 20);

    // Info Siswa
    doc.setFontSize(12);
    doc.text(`Nama: ${result.nama}`, 14, 35);
    doc.text(`Mata Pelajaran: ${result.mata_pelajaran}`, 14, 45);
    doc.text(`Bab: ${result.bab_nama}`, 14, 55);
    doc.text(`Jenis Ujian: ${result.jenis_ujian}`, 14, 65);
    doc.text(`Tanggal: ${formatDate(result.timestamp)}`, 14, 75);

    // Hasil
    doc.setFontSize(14);
    doc.text(`Nilai: ${result.nilai}`, 14, 90);
    doc.text(`Persentase: ${result.persentase}%`, 14, 100);
    doc.text(`Status: ${result.status}`, 14, 110);

    // Detail Jawaban
    doc.setFontSize(12);
    doc.text("Detail Jawaban:", 14, 125);

    let yPos = 135;
    for (let i = 1; i <= 20; i++) {
      const soalKey = `soal_${i}` as keyof ExamResult;
      const jawaban = result[soalKey];
      if (jawaban) {
        doc.text(`Soal ${i}: ${jawaban}`, 14, yPos);
        yPos += 8;

        // Pindah ke halaman baru jika space habis
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
      }
    }

    // Save PDF
    doc.save(
      `Hasil_Ujian_${result.nama}_${result.mata_pelajaran}_${result.bab_nama}.pdf`
    );
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Hasil Ujian</h2>

      {notification.show && (
        <div
          className={`p-4 rounded-lg mb-6 relative ${
            notification.type === "success"
              ? "bg-green-100 text-green-700 border border-green-200"
              : notification.type === "loading"
              ? "bg-blue-100 text-blue-700 border border-blue-200"
              : notification.type === "error"
              ? "bg-red-100 text-red-700 border border-red-200"
              : "bg-gray-100 text-gray-700 border border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {notification.type === "loading" && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
              )}
              {notification.type === "success" && (
                <div className="text-green-600 mr-3">✓</div>
              )}
              {notification.type === "error" && (
                <div className="text-red-600 mr-3">✕</div>
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={closeNotification}
              className="text-gray-500 hover:text-gray-700 ml-4"
              title="Tutup notifikasi"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Dropdown Filters */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Nama
          </label>
          <select
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          >
            <option value="">Semua Nama</option>
            {students.length === 0 ? (
              <option value="" disabled>
                Tidak ada data siswa
              </option>
            ) : (
              students.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))
            )}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Mata Pelajaran
          </label>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          >
            <option value="">Semua Mata Pelajaran</option>
            {mapelFromSheet.length === 0 ? (
              <option value="" disabled>
                Tidak ada data mata pelajaran
              </option>
            ) : (
              mapelFromSheet.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))
            )}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Bab</label>
          <select
            value={chapterFilter}
            onChange={(e) => setChapterFilter(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          >
            <option value="">Semua Bab</option>
            {chapters.length === 0 ? (
              <option value="" disabled>
                Tidak ada data materi
              </option>
            ) : (
              chapters.map((chapter) => (
                <option key={chapter} value={chapter}>
                  {chapter}
                </option>
              ))
            )}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          >
            <option value="">Semua Status</option>
            <option value="Lulus">Lulus</option>
            <option value="Tidak Lulus">Tidak Lulus</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Jenis Ujian
          </label>
          <select
            value={examTypeFilter}
            onChange={(e) => setExamTypeFilter(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          >
            <option value="">Semua Jenis Ujian</option>
            {examTypes.length === 0 ? (
              <option value="" disabled>
                Tidak ada data jenis ujian
              </option>
            ) : (
              examTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))
            )}
          </select>
          {/* Dropdown Peringkat */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Peringkat
            </label>
            <select
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(e.target.value as "highest" | "lowest" | "")
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            >
              <option value="">Default</option>
              <option value="highest">Tertinggi</option>
              <option value="lowest">Terendah</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!isLoading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr>
                <th className="py-2 px-4 border">Aksi</th>
                <th className="py-2 px-4 border">No.</th>
                <th className="py-2 px-4 border">Nama</th>
                <th className="py-2 px-4 border">Mata Pelajaran</th>
                <th className="py-2 px-4 border">Bab</th>
                <th className="py-2 px-4 border">Nilai</th>
                <th className="py-2 px-4 border">Status</th>
                <th className="py-2 px-4 border">Persentase</th>
                <th className="py-2 px-4 border">Tanggal</th>
                <th className="py-2 px-4 border">Jenis Ujian</th>
                <th className="py-2 px-4 border">File Ujian</th>
                <th className="py-2 px-4 border">Soal 1</th>
                <th className="py-2 px-4 border">Soal 2</th>
                <th className="py-2 px-4 border">Soal 3</th>
                <th className="py-2 px-4 border">Soal 4</th>
                <th className="py-2 px-4 border">Soal 5</th>
                <th className="py-2 px-4 border">Soal 6</th>
                <th className="py-2 px-4 border">Soal 7</th>
                <th className="py-2 px-4 border">Soal 8</th>
                <th className="py-2 px-4 border">Soal 9</th>
                <th className="py-2 px-4 border">Soal 10</th>
                <th className="py-2 px-4 border">Soal 11</th>
                <th className="py-2 px-4 border">Soal 12</th>
                <th className="py-2 px-4 border">Soal 13</th>
                <th className="py-2 px-4 border">Soal 14</th>
                <th className="py-2 px-4 border">Soal 15</th>
                <th className="py-2 px-4 border">Soal 16</th>
                <th className="py-2 px-4 border">Soal 17</th>
                <th className="py-2 px-4 border">Soal 18</th>
                <th className="py-2 px-4 border">Soal 19</th>
                <th className="py-2 px-4 border">Soal 20</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={30} className="py-2 px-4 border text-center">
                    Tidak ada data hasil ujian yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredResults.map((result, index) => (
                  <tr key={result.id || index}>
                    <td className="py-2 px-4 border">
                      <div className="flex gap-2 items-center">
                        {/* Tombol Download PDF */}
                        <button
                          onClick={() => downloadPDF(result, index)}
                          disabled={isDeleting !== null}
                          className={`transition-colors ${
                            isDeleting !== null
                              ? "text-gray-400 cursor-not-allowed"
                              : "text-green-500 hover:text-green-700"
                          }`}
                          title="Download PDF"
                        >
                          <FileText size={18} />
                        </button>

                        {/* Tombol Delete */}
                        <button
                          onClick={() =>
                            deleteExamResult(
                              result.id || String(index + 2),
                              result
                            )
                          }
                          disabled={isDeleting !== null}
                          className={`transition-colors ${
                            isDeleting !== null
                              ? "text-gray-400 cursor-not-allowed"
                              : "text-red-500 hover:text-red-700"
                          }`}
                          title={
                            isDeleting !== null
                              ? "Tunggu proses penghapusan selesai..."
                              : "Hapus hasil ujian"
                          }
                        >
                          {isDeleting === (result.id || String(index + 2)) ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-2 px-4 border text-center font-medium">
                      {index + 1}
                    </td>
                    <td className="py-2 px-4 border">{result.nama}</td>
                    <td className="py-2 px-4 border">
                      {result.mata_pelajaran}
                    </td>
                    <td className="py-2 px-4 border">{result.bab_nama}</td>
                    <td className="py-2 px-4 border">{result.nilai}</td>
                    <td className="py-2 px-4 border">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          result.status === "Lulus"
                            ? "bg-green-100 text-green-800"
                            : result.status === "Tidak Lulus"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {result.status}
                      </span>
                    </td>
                    <td className="py-2 px-4 border">{result.persentase}%</td>
                    <td className="py-2 px-4 border">
                      {formatDate(result.timestamp)}
                    </td>
                    <td className="py-2 px-4 border">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          result.jenis_ujian === "UTAMA"
                            ? "bg-blue-100 text-blue-800"
                            : result.jenis_ujian === "REMEDIAL"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {result.jenis_ujian}
                      </span>
                    </td>
                    <td className="py-2 px-4 border">
                      {result.file_ujian ? (
                        <a
                          href={result.file_ujian}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                          onError={() => "File tidak tersedia"}
                        >
                          Lihat File
                        </a>
                      ) : (
                        <span className="text-gray-500">Tidak ada file</span>
                      )}
                    </td>{" "}
                    {/* Add this block */}
                    <td className="py-2 px-4 border">{result.soal_1}</td>
                    <td className="py-2 px-4 border">{result.soal_2}</td>
                    <td className="py-2 px-4 border">{result.soal_3}</td>
                    <td className="py-2 px-4 border">{result.soal_4}</td>
                    <td className="py-2 px-4 border">{result.soal_5}</td>
                    <td className="py-2 px-4 border">{result.soal_6}</td>
                    <td className="py-2 px-4 border">{result.soal_7}</td>
                    <td className="py-2 px-4 border">{result.soal_8}</td>
                    <td className="py-2 px-4 border">{result.soal_9}</td>
                    <td className="py-2 px-4 border">{result.soal_10}</td>
                    <td className="py-2 px-4 border">{result.soal_11}</td>
                    <td className="py-2 px-4 border">{result.soal_12}</td>
                    <td className="py-2 px-4 border">{result.soal_13}</td>
                    <td className="py-2 px-4 border">{result.soal_14}</td>
                    <td className="py-2 px-4 border">{result.soal_15}</td>
                    <td className="py-2 px-4 border">{result.soal_16}</td>
                    <td className="py-2 px-4 border">{result.soal_17}</td>
                    <td className="py-2 px-4 border">{result.soal_18}</td>
                    <td className="py-2 px-4 border">{result.soal_19}</td>
                    <td className="py-2 px-4 border">{result.soal_20}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const MapelData: React.FC = () => {
  const [mapel, setMapel] = useState<string>("");
  const [materi, setMateri] = useState<string>("");
  const [sheetName, setSheetName] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<string>("");
  const [mapelData, setMapelData] = useState<MapelItem[]>([]);
  const [editingMapelId, setEditingMapelId] = useState<string | null>(null);
  const [editMapel, setEditMapel] = useState<string>("");
  const [editMateri, setEditMateri] = useState<string>("");
  const [editSheetName, setEditSheetName] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<string>("");
  const [editStatus, setEditStatus] = useState<string>("");

  const fetchMapelData = () => {
    setIsLoading(true);
    fetch(`${scriptURL}?action=getMapelData`, {
      method: "GET",
      mode: "cors",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          // Tambahkan ID berdasarkan index dan sertakan SEMUA field termasuk 'status'
          const dataWithId = data.data.map((item: any, index: number) => ({
            id: String(index + 2), // Asumsi data dimulai dari row 2
            mapel: item.mapel || "",
            materi: item.materi || "",
            sheetName: item.sheetName || "",
            status: item.status || "", // <-- INI YANG BARU DAN WAJIB ADA
          }));
          setMapelData(dataWithId);
          setSubmitStatus(
            `✅ Berhasil mengambil ${data.data.length} data mapel.`
          );
        } else {
          setSubmitStatus("❌ Format response tidak sesuai dari DataMapel.");
          setMapelData([]);
        }
        setIsLoading(false);
      })
      .catch((error) => {
        setSubmitStatus(`❌ Gagal mengambil data mapel: ${error.message}`);
        console.error("Fetch error:", error);
        setMapelData([]);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchMapelData();
  }, []);

  const handleSubmit = () => {
    if (!mapel.trim() || !materi.trim() || !sheetName.trim()) {
      setSubmitStatus("⚠️ Semua field wajib diisi!");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("Mengirim data...");

    const requestData = {
      action: "addMapelData",
      mapel: mapel.trim(),
      materi: materi.trim(),
      sheetName: sheetName.trim(),
      status: status.trim(), // <-- TAMBAHKAN INI
    };

    fetch(scriptURL, {
      method: "POST",
      mode: "no-cors", // Ganti ke 'cors' jika memungkinkan untuk error handling yang lebih baik
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    })
      .then(() => {
        setSubmitStatus("✅ Data mapel berhasil ditambahkan!");
        setMapel("");
        setMateri("");
        setSheetName("");
        setStatus(""); // <-- TAMBAHKAN INI
        setTimeout(() => {
          fetchMapelData();
        }, 1000);
        setIsSubmitting(false);
      })
      .catch((error) => {
        setSubmitStatus(`❌ Gagal menambahkan data mapel: ${error.message}`);
        console.error("Fetch error:", error);
        setIsSubmitting(false);
      });
  };

  const deleteAllMapel = () => {
    if (
      !confirm(
        "Apakah Anda yakin ingin menghapus semua data mapel? Tindakan ini tidak bisa dibatalkan dan akan mempengaruhi seluruh sistem!"
      )
    )
      return;

    setIsSubmitting(true);
    setSubmitStatus("Menghapus semua data mapel...");

    fetch(scriptURL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "deleteAllQuestions", // Menggunakan fungsi yang sudah ada
      }),
    })
      .then(() => {
        setSubmitStatus("✅ Semua data mapel berhasil dihapus!");
        setMapelData([]);
        setIsSubmitting(false);
      })
      .catch((error) => {
        setSubmitStatus(`❌ Gagal menghapus data mapel: ${error.message}`);
        console.error("Fetch error:", error);
        setIsSubmitting(false);
      });
  };

  const startEditingMapel = (item: MapelItem) => {
    setEditingMapelId(item.id);
    setEditMapel(item.mapel);
    setEditMateri(item.materi);
    setEditSheetName(item.sheetName);
    setEditStatus(item.status); // <-- TAMBAHKAN INI
    setSubmitStatus("");
  };

  const saveEditedMapel = (id: string) => {
    if (!editMapel.trim() || !editMateri.trim() || !editSheetName.trim()) {
      setSubmitStatus("⚠️ Semua field wajib diisi!");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("Menyimpan perubahan...");

    const requestData = {
      action: "editMapelData",
      id,
      mapel: editMapel.trim(),
      materi: editMateri.trim(),
      sheetName: editSheetName.trim(),
      status: editStatus.trim(), // <-- TAMBAHKAN INI
    };

    fetch(scriptURL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    })
      .then(() => {
        setSubmitStatus("✅ Data mapel berhasil diperbarui!");
        setEditingMapelId(null);
        setEditMapel("");
        setEditMateri("");
        setEditSheetName("");
        setEditStatus(""); // <-- TAMBAHKAN INI
        setTimeout(() => {
          fetchMapelData();
        }, 1000);
        setIsSubmitting(false);
      })
      .catch((error) => {
        setSubmitStatus(`❌ Gagal memperbarui data mapel: ${error.message}`);
        console.error("Fetch error:", error);
        setIsSubmitting(false);
      });
  };

  const cancelEditingMapel = () => {
    setEditingMapelId(null);
    setEditMapel("");
    setEditMateri("");
    setEditSheetName("");
    setEditStatus(""); // <-- TAMBAHKAN INI
    setSubmitStatus("");
  };

  const deleteMapelItem = (item: MapelItem) => {
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus data mapel "${item.mapel}" - ${item.materi}? Tindakan ini akan mempengaruhi soal-soal yang terkait.`
      )
    )
      return;

    setIsSubmitting(true);
    setSubmitStatus(`Menghapus data mapel ${item.mapel}...`);

    const requestData = {
      action: "deleteMapelData",
      id: item.id,
    };

    fetch(scriptURL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    })
      .then(() => {
        setSubmitStatus(`✅ Data mapel ${item.mapel} berhasil dihapus!`);
        setTimeout(() => {
          fetchMapelData();
        }, 1000);
        setIsSubmitting(false);
      })
      .catch((error) => {
        setSubmitStatus(
          `❌ Gagal menghapus data mapel ${item.mapel}: ${error.message}`
        );
        console.error("Delete error:", error);
        setIsSubmitting(false);
      });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="text-blue-600" size={32} />
            <h1 className="text-3xl font-bold text-gray-800">
              Data Mata Pelajaran
            </h1>
          </div>
          <p className="text-gray-600 mb-6">
            Kelola data mata pelajaran, materi, dan nama sheet terkait.
            Perubahan di sini akan mempengaruhi seluruh sistem.
          </p>

          {submitStatus && (
            <div
              className={`p-4 rounded-lg mb-6 ${
                submitStatus.includes("berhasil") || submitStatus.includes("✅")
                  ? "bg-green-100 text-green-700 border border-green-200"
                  : submitStatus.includes("Mengirim") ||
                    submitStatus.includes("Menghapus") ||
                    submitStatus.includes("Menyimpan")
                  ? "bg-blue-100 text-blue-700 border border-blue-200"
                  : "bg-red-100 text-red-700 border border-red-200"
              }`}
            >
              {submitStatus}
            </div>
          )}

          <div className="grid gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Mata Pelajaran
              </label>
              <input
                type="text"
                value={mapel}
                onChange={(e) => setMapel(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Masukkan nama mata pelajaran"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Materi
              </label>
              <input
                type="text"
                value={materi}
                onChange={(e) => setMateri(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Masukkan nama materi"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Sheet (di Google Sheets)
              </label>
              <input
                type="text"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Masukkan nama sheet yang sesuai"
                disabled={isSubmitting}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting}
                >
                  <option value="">Pilih Status</option>
                  <option value="Izinkan">Izinkan</option>
                  <option value="Tidak Diizinkan">Tidak Diizinkan</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Atur apakah mata pelajaran ini dapat digunakan untuk membuat
                  soal.
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Pastikan sheet dengan nama ini sudah ada di spreadsheet Anda.
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Save size={20} />
                {isSubmitting ? "Mengirim..." : "Tambah Data Mapel"}
              </button>
              <button
                onClick={deleteAllMapel}
                disabled={isSubmitting || mapelData.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Trash2 size={20} />
                {isSubmitting ? "Menghapus..." : "Hapus Semua Data Mapel"}
              </button>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Daftar Data Mapel ({mapelData.length} item)
            </h3>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Memuat data mapel...</p>
              </div>
            ) : mapelData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Mata Pelajaran
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Materi
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Nama Sheet
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mapelData.map((item) => (
                      <tr key={item.id} className="border-t">
                        {editingMapelId === item.id ? (
                          <>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              <input
                                type="text"
                                value={editMapel}
                                onChange={(e) => setEditMapel(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Nama Mapel"
                                disabled={isSubmitting}
                              />
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              <input
                                type="text"
                                value={editMateri}
                                onChange={(e) => setEditMateri(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Nama Materi"
                                disabled={isSubmitting}
                              />
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              <input
                                type="text"
                                value={editSheetName}
                                onChange={(e) =>
                                  setEditSheetName(e.target.value)
                                }
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Nama Sheet"
                                disabled={isSubmitting}
                              />
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {/* HANYA TAMPILKAN DROPDOWN, HAPUS INPUT TEXT */}
                              <select
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={isSubmitting}
                              >
                                <option value="">Pilih Status</option>
                                <option value="Izinkan">Izinkan</option>
                                <option value="Tidak Diizinkan">
                                  Tidak Diizinkan
                                </option>
                              </select>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveEditedMapel(item.id)}
                                  disabled={isSubmitting}
                                  className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                  <Save size={16} />
                                  {isSubmitting ? "Menyimpan..." : "Simpan"}
                                </button>
                                <button
                                  onClick={cancelEditingMapel}
                                  disabled={isSubmitting}
                                  className="flex items-center gap-1 px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                  Batal
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {item.mapel}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {item.materi}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {item.sheetName}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  item.status === "Izinkan"
                                    ? "bg-green-100 text-green-800"
                                    : item.status === "Tidak Diizinkan"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {item.status || "Tidak Diatur"}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => startEditingMapel(item)}
                                  disabled={isSubmitting}
                                  className="text-blue-500 hover:text-blue-700 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
                                  title="Edit data mapel"
                                >
                                  <Edit size={18} />
                                </button>
                                <button
                                  onClick={() => deleteMapelItem(item)}
                                  disabled={isSubmitting}
                                  className="text-red-500 hover:text-red-700 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
                                  title="Hapus data mapel"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">Belum ada data mata pelajaran.</p>
                <p className="text-sm text-gray-500 mt-2">
                  Tambah data baru menggunakan form di atas.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SHEET_NILAI_LIST = [
  { label: "PPKN", sheetParam: "NilaiPPKN" },
  { label: "B. Indonesia", sheetParam: "NilaiBIndo" },
  { label: "Matematika", sheetParam: "NilaiMTK" },
  { label: "IPAS", sheetParam: "NilaiIPAS" },
  { label: "B. Inggris", sheetParam: "NilaiBInggris" },
  { label: "Seni Musik", sheetParam: "NilaiSeniMusik" },
];

const BAB_COLUMNS = [
  { key: "bab1", label: "BAB 1" },
  { key: "bab2", label: "BAB 2" },
  { key: "bab3", label: "BAB 3" },
  { key: "bab4", label: "BAB 4" },
  { key: "bab5", label: "BAB 5" },
  { key: "bab6", label: "BAB 6" },
  { key: "bab7", label: "BAB 7" },
  { key: "bab8", label: "BAB 8" },
  { key: "bab9", label: "BAB 9" },
  { key: "bab10", label: "BAB 10" },
  { key: "sas1", label: "SAS 1" },
  { key: "sas2", label: "SAS 2" },
];

interface NilaiRow {
  nama_siswa: string;
  mapel: string;
  bab1: number | string;
  bab2: number | string;
  bab3: number | string;
  bab4: number | string;
  bab5: number | string;
  bab6: number | string;
  bab7: number | string;
  bab8: number | string;
  bab9: number | string;
  bab10: number | string;
  sas1: number | string;
  sas2: number | string;
}

const NilaiSiswa: React.FC = () => {
  const [selectedMapel, setSelectedMapel] = useState<string>("NilaiPPKN");
  const [nilaiData, setNilaiData] = useState<NilaiRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [searchName, setSearchName] = useState<string>("");

  const fetchNilai = (sheetParam: string) => {
    setIsLoading(true);
    setError("");
    setNilaiData([]);
    fetch(
      `${scriptURL}?action=getNilaiSiswa&sheet=${encodeURIComponent(
        sheetParam
      )}`,
      { method: "GET", mode: "cors" }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) setNilaiData(data.data);
        else setError("❌ Gagal mengambil data nilai: " + (data.message || ""));
        setIsLoading(false);
      })
      .catch((err) => {
        setError("❌ " + err.message);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchNilai(selectedMapel);
  }, [selectedMapel]);

  const filtered = nilaiData.filter((row) =>
    row.nama_siswa?.toLowerCase().includes(searchName.toLowerCase())
  );

  const calcAverage = (row: NilaiRow): string => {
    const vals = BAB_COLUMNS.map((c) =>
      Number(row[c.key as keyof NilaiRow])
    ).filter((v) => !isNaN(v) && v > 0);
    if (!vals.length) return "-";
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  };

  const downloadExcel = (colKey: string, colLabel: string) => {
    const rows = filtered
      .map((row) => {
        const val = row[colKey as keyof NilaiRow];
        const n = Number(val);
        return {
          Nama: row.nama_siswa,
          Nilai: val !== "" && val !== null && !isNaN(n) && n > 0 ? n : "",
        };
      })
      .filter((r) => r.Nilai !== ""); // hanya yang ada nilainya

    if (rows.length === 0) {
      alert(`Tidak ada data nilai untuk ${colLabel}`);
      return;
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, colLabel);
    XLSX.writeFile(wb, `Nilai_${currentLabel}_${colLabel}.xlsx`);
  };

  const currentLabel =
    SHEET_NILAI_LIST.find((m) => m.sheetParam === selectedMapel)?.label || "";

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%)",
        fontFamily: "'Segoe UI',system-ui,sans-serif",
        padding: "24px 16px",
      }}
    >
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .nrow:hover{background:rgba(255,255,255,0.04)!important}`}</style>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20,
            padding: "24px 32px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              background: "linear-gradient(135deg,#3b82f6,#8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              boxShadow: "0 8px 20px rgba(59,130,246,0.4)",
            }}
          >
            🎓
          </div>
          <div>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: "#fff",
                margin: 0,
              }}
            >
              Nilai Ujian Siswa
            </h1>
            <p
              style={{
                color: "rgba(255,255,255,0.45)",
                margin: "4px 0 0",
                fontSize: 13,
              }}
            >
              Rekap nilai per mata pelajaran — BAB 1 s.d. BAB 10 &amp; SAS
            </p>
          </div>
          <button
            onClick={() => fetchNilai(selectedMapel)}
            disabled={isLoading}
            style={{
              marginLeft: "auto",
              padding: "9px 18px",
              borderRadius: 11,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.7)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            🔄 {isLoading ? "Memuat..." : "Refresh"}
          </button>
        </div>

        {/* Tabs + Search */}
        <div
          style={{
            display: "flex",
            gap: 8,
            background: "rgba(255,255,255,0.04)",
            borderRadius: 14,
            padding: 6,
            border: "1px solid rgba(255,255,255,0.08)",
            marginBottom: 16,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {SHEET_NILAI_LIST.map((m) => (
            <button
              key={m.sheetParam}
              onClick={() => setSelectedMapel(m.sheetParam)}
              style={{
                padding: "9px 20px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                transition: "all 0.2s",
                background:
                  selectedMapel === m.sheetParam
                    ? "linear-gradient(135deg,#3b82f6,#8b5cf6)"
                    : "transparent",
                color:
                  selectedMapel === m.sheetParam
                    ? "#fff"
                    : "rgba(255,255,255,0.45)",
                boxShadow:
                  selectedMapel === m.sheetParam
                    ? "0 4px 14px rgba(59,130,246,0.35)"
                    : "none",
              }}
            >
              {m.label}
            </button>
          ))}
          <div style={{ marginLeft: "auto", position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 11,
                top: "50%",
                transform: "translateY(-50%)",
                color: "rgba(255,255,255,0.35)",
                pointerEvents: "none",
              }}
            >
              🔍
            </span>
            <input
              type="text"
              placeholder="Cari nama siswa..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              style={{
                padding: "9px 14px 9px 36px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                fontSize: 13,
                outline: "none",
                width: 200,
              }}
            />
          </div>
        </div>

        {/* Stats */}
        {!isLoading && !error && nilaiData.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
              gap: 10,
              marginBottom: 16,
            }}
          >
            {[
              {
                icon: "👥",
                label: "Total Siswa",
                value: filtered.length,
                color: "#3b82f6",
              },
              {
                icon: "📚",
                label: "Mata Pelajaran",
                value: currentLabel,
                color: "#8b5cf6",
              },
              {
                icon: "✅",
                label: "Nilai ≥ 75",
                color: "#10b981",
                value:
                  filtered.filter((r) => {
                    const v = BAB_COLUMNS.map((c) =>
                      Number(r[c.key as keyof NilaiRow])
                    ).filter((x) => !isNaN(x) && x > 0);
                    return (
                      v.length && v.reduce((a, b) => a + b, 0) / v.length >= 75
                    );
                  }).length + " siswa",
              },
              {
                icon: "⚠️",
                label: "Perlu Perhatian",
                color: "#f59e0b",
                value:
                  filtered.filter((r) => {
                    const v = BAB_COLUMNS.map((c) =>
                      Number(r[c.key as keyof NilaiRow])
                    ).filter((x) => !isNaN(x) && x > 0);
                    return (
                      v.length && v.reduce((a, b) => a + b, 0) / v.length < 75
                    );
                  }).length + " siswa",
              },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${s.color}30`,
                  borderRadius: 12,
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 22 }}>{s.icon}</span>
                <div>
                  <div
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    {s.label}
                  </div>
                  <div style={{ color: "#fff", fontWeight: 800, fontSize: 17 }}>
                    {s.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 18,
            overflow: "hidden",
          }}
        >
          {isLoading ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: "rgba(255,255,255,0.45)",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  border: "3px solid rgba(59,130,246,0.25)",
                  borderTopColor: "#3b82f6",
                  borderRadius: "50%",
                  margin: "0 auto 14px",
                  animation: "spin 1s linear infinite",
                }}
              />
              Memuat data nilai...
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>😕</div>
              <p
                style={{ color: "#ef4444", margin: "0 0 8px", fontWeight: 600 }}
              >
                {error}
              </p>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
                Pastikan fungsi{" "}
                <code
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  getNilaiSiswa
                </code>{" "}
                sudah ditambahkan ke Google Apps Script dan di-deploy ulang.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: "rgba(255,255,255,0.35)",
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 10 }}>📭</div>
              {searchName
                ? `Tidak ada siswa "${searchName}"`
                : "Tidak ada data nilai."}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 1000,
                }}
              >
                <thead>
                  <tr
                    style={{
                      background:
                        "linear-gradient(90deg,rgba(59,130,246,0.18),rgba(139,92,246,0.18))",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <th
                      style={{
                        padding: "13px 14px",
                        textAlign: "center",
                        color: "rgba(255,255,255,0.5)",
                        fontWeight: 700,
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: 1,
                        width: 44,
                      }}
                    >
                      No
                    </th>
                    <th
                      style={{
                        padding: "13px 18px",
                        textAlign: "left",
                        color: "rgba(255,255,255,0.5)",
                        fontWeight: 700,
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: 1,
                        minWidth: 190,
                      }}
                    >
                      Nama Siswa
                    </th>
                    {BAB_COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        style={{
                          padding: "13px 8px",
                          textAlign: "center",
                          color:
                            col.key === "sas1" || col.key === "sas2"
                              ? "#c084fc"
                              : "rgba(255,255,255,0.5)",
                          fontWeight: 700,
                          fontSize: 11,
                          textTransform: "uppercase",
                          minWidth: 65,
                          borderLeft:
                            col.key === "sas1"
                              ? "2px solid rgba(139,92,246,0.3)"
                              : undefined,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {col.label}
                          <button
                            onClick={() => downloadExcel(col.key, col.label)}
                            title={`Download Excel ${col.label}`}
                            style={{
                              background: "rgba(255,255,255,0.08)",
                              border: "1px solid rgba(255,255,255,0.15)",
                              borderRadius: 6,
                              color: "rgba(255,255,255,0.6)",
                              cursor: "pointer",
                              fontSize: 11,
                              padding: "2px 6px",
                              display: "flex",
                              alignItems: "center",
                              gap: 3,
                              transition: "all 0.15s",
                            }}
                            onMouseEnter={(e) => {
                              (
                                e.currentTarget as HTMLButtonElement
                              ).style.background = "rgba(16,185,129,0.25)";
                              (
                                e.currentTarget as HTMLButtonElement
                              ).style.color = "#34d399";
                              (
                                e.currentTarget as HTMLButtonElement
                              ).style.borderColor = "rgba(16,185,129,0.4)";
                            }}
                            onMouseLeave={(e) => {
                              (
                                e.currentTarget as HTMLButtonElement
                              ).style.background = "rgba(255,255,255,0.08)";
                              (
                                e.currentTarget as HTMLButtonElement
                              ).style.color = "rgba(255,255,255,0.6)";
                              (
                                e.currentTarget as HTMLButtonElement
                              ).style.borderColor = "rgba(255,255,255,0.15)";
                            }}
                          >
                            ⬇ xls
                          </button>
                        </div>
                      </th>
                    ))}
                    <th
                      style={{
                        padding: "13px 14px",
                        textAlign: "center",
                        color: "#fbbf24",
                        fontWeight: 700,
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: 1,
                        borderLeft: "2px solid rgba(251,191,36,0.25)",
                        minWidth: 85,
                      }}
                    >
                      Rata-rata
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, idx) => {
                    const avg = calcAverage(row);
                    const avgNum = parseFloat(avg);
                    const scoreColor = (v: number) =>
                      v >= 90
                        ? "#34d399"
                        : v >= 75
                        ? "#60a5fa"
                        : v >= 60
                        ? "#fbbf24"
                        : "#f87171";
                    const scoreBg = (v: number) =>
                      v >= 90
                        ? "rgba(16,185,129,0.16)"
                        : v >= 75
                        ? "rgba(59,130,246,0.16)"
                        : v >= 60
                        ? "rgba(245,158,11,0.16)"
                        : "rgba(239,68,68,0.16)";
                    return (
                      <tr
                        key={idx}
                        className="nrow"
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          transition: "background 0.15s",
                        }}
                      >
                        <td
                          style={{
                            padding: "11px 14px",
                            textAlign: "center",
                            color: "rgba(255,255,255,0.28)",
                            fontSize: 13,
                          }}
                        >
                          {idx + 1}
                        </td>
                        <td
                          style={{
                            padding: "11px 18px",
                            color: "#e2e8f0",
                            fontWeight: 600,
                            fontSize: 14,
                          }}
                        >
                          {row.nama_siswa}
                        </td>
                        {BAB_COLUMNS.map((col) => {
                          const val = row[col.key as keyof NilaiRow];
                          const n = Number(val);
                          const ok =
                            val !== "" && val !== null && !isNaN(n) && n > 0;
                          return (
                            <td
                              key={col.key}
                              style={{
                                padding: "9px 6px",
                                textAlign: "center",
                                borderLeft:
                                  col.key === "sas1"
                                    ? "2px solid rgba(139,92,246,0.1)"
                                    : undefined,
                              }}
                            >
                              {ok ? (
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "3px 9px",
                                    borderRadius: 7,
                                    background: scoreBg(n),
                                    color: scoreColor(n),
                                    fontWeight: 700,
                                    fontSize: 13,
                                  }}
                                >
                                  {n}
                                </span>
                              ) : (
                                <span
                                  style={{
                                    color: "rgba(255,255,255,0.13)",
                                    fontSize: 15,
                                  }}
                                >
                                  —
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td
                          style={{
                            padding: "9px 12px",
                            textAlign: "center",
                            borderLeft: "2px solid rgba(251,191,36,0.1)",
                          }}
                        >
                          {avg !== "-" ? (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 12px",
                                borderRadius: 9,
                                background: scoreBg(avgNum),
                                color: scoreColor(avgNum),
                                fontWeight: 800,
                                fontSize: 14,
                                border: "1px solid",
                                borderColor: scoreColor(avgNum) + "55",
                              }}
                            >
                              {avg}
                            </span>
                          ) : (
                            <span style={{ color: "rgba(255,255,255,0.15)" }}>
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Legend */}
        {!isLoading && !error && nilaiData.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 18,
              marginTop: 14,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {[
              ["#34d399", "≥ 90 — Sangat Baik"],
              ["#60a5fa", "75–89 — Baik"],
              ["#fbbf24", "60–74 — Cukup"],
              ["#f87171", "< 60 — Perlu Bimbingan"],
            ].map(([color, label]) => (
              <div
                key={label}
                style={{ display: "flex", alignItems: "center", gap: 7 }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: color,
                    opacity: 0.75,
                  }}
                />
                <span style={{ color: "rgba(255,255,255,0.38)", fontSize: 12 }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <nav className="bg-blue-600 text-white p-4 shadow-md">
        <div className="max-w-4xl mx-auto flex gap-4">
          <Link to="/" className="flex items-center gap-2 hover:underline">
            <FileText size={20} />
            Pembuat Soal
          </Link>
          <Link
            to="/students"
            className="flex items-center gap-2 hover:underline"
          >
            <Users size={20} />
            Data Siswa
          </Link>
          <Link to="/mapel" className="flex items-center gap-2 hover:underline">
            <BookOpen size={20} />
            Data Mapel
          </Link>
          <Link
            to="/exam-results"
            className="flex items-center gap-2 hover:underline"
          >
            <BarChart2 size={20} />
            Hasil Ujian
          </Link>
          <Link
            to="/nilai-siswa"
            className="flex items-center gap-2 hover:underline"
          >
            <GraduationCap size={20} />
            Nilai Siswa
          </Link>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<QuizMaker />} />
        <Route path="/students" element={<StudentData />} />
        <Route path="/mapel" element={<MapelData />} /> {/* Route Baru */}
        <Route path="/exam-results" element={<ExamResults />} />
        <Route path="/nilai-siswa" element={<NilaiSiswa />} />
      </Routes>
    </Router>
  );
};

export default App;
