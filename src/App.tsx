import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Save,
  FileText,
  Users,
  Edit,
  BarChart2,
} from "lucide-react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import * as XLSX from "xlsx"; // For XLSX file parsing

// Replace with your deployed Google Apps Script Web App URL
const scriptURL =
  "https://script.google.com/macros/s/AKfycbxKMaz7DFbKbBL9IS-5c2F2GOxtEwFHVVnsb8EZqEIAcwChs38IqGM_QqZ1OSNHPAg6tg/exec";

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
  status: string;
  nama: string;
  mata_pelajaran: string;
  bab_nama: string;
  nilai: number;
  persentase: number;
  timestamp: string;
  jenis_ujian: string;
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
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

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
            "Format file tidak sesuai. Pastikan kolom: SOAL, GAMBAR, OPSI A, OPSI B, OPSI C, OPSI D, JAWABAN."
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
              throw new Error(`Ada field kosong pada baris ${index + 2}.`);
            }
            return {
              id: String(index + 1),
              soal: String(row["SOAL"]).trim(),
              gambar: String(row["GAMBAR"] || "").trim(),
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

    if (
      !questionToSave.soal.trim() ||
      !questionToSave.opsiA.trim() ||
      !questionToSave.opsiB.trim() ||
      !questionToSave.opsiC.trim() ||
      !questionToSave.opsiD.trim() ||
      !questionToSave.jawaban.trim()
    ) {
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
        soal: questionToSave.soal,
        gambar: questionToSave.gambar,
        opsiA: questionToSave.opsiA,
        opsiB: questionToSave.opsiB,
        opsiC: questionToSave.opsiC,
        opsiD: questionToSave.opsiD,
        jawaban: questionToSave.jawaban,
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

    const hasEmptyFields = questions.some(
      (q) =>
        !q.soal.trim() ||
        !q.opsiA.trim() ||
        !q.opsiB.trim() ||
        !q.opsiC.trim() ||
        !q.opsiD.trim() ||
        !q.jawaban.trim()
    );
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

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unggah File XLSX
            </label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!selectedSheet}
              />
              <button
                onClick={handleFileUpload}
                disabled={!file || isSubmitting || !selectedSheet}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Plus size={20} />
                {isSubmitting ? "Mengunggah..." : "Unggah dan Ganti Soal"}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              File harus dalam format XLSX dengan kolom: SOAL, GAMBAR, OPSI A,
              OPSI B, OPSI C, OPSI D, JAWABAN.
            </p>
          </div>

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
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
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
            (result: ExamResult) => ({
              nama: result.nama || "",
              mata_pelajaran: result.mata_pelajaran || "",
              bab_nama: result.bab_nama || "",
              nilai: Number(result.nilai) || 0,
              status: result.status || "",
              persentase: Number(result.persentase) || 0,
              timestamp: result.timestamp || "",
              jenis_ujian: result.jenis_ujian || "",
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
    const intervalId = setInterval(fetchExamResults, 10000);
    return () => clearInterval(intervalId);
  }, []);

  // Filter the exam results based on dropdown selections
  const filteredResults = examResults.filter(
    (result) =>
      (!nameFilter || result.nama === nameFilter) &&
      (!subjectFilter || result.mata_pelajaran === subjectFilter) &&
      (!chapterFilter || result.bab_nama === chapterFilter) &&
      (!statusFilter || result.status === statusFilter) &&
      (!examTypeFilter || result.jenis_ujian === examTypeFilter)
  );

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Hasil Ujian</h2>

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
            {subjects.length === 0 ? (
              <option value="" disabled>
                Tidak ada data mata pelajaran
              </option>
            ) : (
              subjects.map((subject) => (
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
        </div>
      </div>

      {isLoading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!isLoading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr>
                <th className="py-2 px-4 border">Nama</th>
                <th className="py-2 px-4 border">Mata Pelajaran</th>
                <th className="py-2 px-4 border">Bab</th>
                <th className="py-2 px-4 border">Nilai</th>
                <th className="py-2 px-4 border">Status</th>
                <th className="py-2 px-4 border">Persentase</th>
                <th className="py-2 px-4 border">Tanggal</th>
                <th className="py-2 px-4 border">Jenis Ujian</th>
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
                  <td colSpan={28} className="py-2 px-4 border text-center">
                    Tidak ada data hasil ujian yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredResults.map((result, index) => (
                  <tr key={index}>
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
          <Link
            to="/exam-results"
            className="flex items-center gap-2 hover:underline"
          >
            <BarChart2 size={20} />
            Hasil Ujian
          </Link>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<QuizMaker />} />
        <Route path="/students" element={<StudentData />} />
        <Route path="/exam-results" element={<ExamResults />} />
      </Routes>
    </Router>
  );
};

export default App;
